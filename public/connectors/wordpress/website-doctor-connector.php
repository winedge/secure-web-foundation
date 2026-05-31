<?php
/**
 * Plugin Name: Website Doctor Connector
 * Description: Polls Website Doctor for approved patches and applies them safely to this WordPress install.
 * Version:     0.1.0
 * Author:      Website Doctor
 * License:     MIT
 *
 * Configure via wp-config.php:
 *   define('WD_API_URL',   'https://<ref>.supabase.co/functions/v1');
 *   define('WD_PUBLIC_ID', 'conn_pub_xxx');
 *   define('WD_TOKEN',     'conn_secret_xxx');
 *   define('WD_ROOT',      ABSPATH);          // optional
 *   define('WD_INTERVAL',  'wd_five_minutes'); // optional cron schedule
 */

if (!defined('ABSPATH')) { exit; }

class WD_Connector {
    const HOOK = 'wd_connector_tick';

    public static function boot() {
        add_filter('cron_schedules', [__CLASS__, 'schedules']);
        add_action(self::HOOK, [__CLASS__, 'tick']);
        register_activation_hook(__FILE__, [__CLASS__, 'activate']);
        register_deactivation_hook(__FILE__, [__CLASS__, 'deactivate']);
        add_action('admin_post_wd_tick_now', [__CLASS__, 'tick_now']);
    }

    public static function schedules($s) {
        $s['wd_five_minutes'] = ['interval' => 300, 'display' => 'Every 5 minutes (Website Doctor)'];
        return $s;
    }

    public static function activate() {
        $sched = defined('WD_INTERVAL') ? WD_INTERVAL : 'wd_five_minutes';
        if (!wp_next_scheduled(self::HOOK)) wp_schedule_event(time() + 60, $sched, self::HOOK);
    }

    public static function deactivate() {
        $ts = wp_next_scheduled(self::HOOK);
        if ($ts) wp_unschedule_event($ts, self::HOOK);
    }

    public static function tick_now() {
        if (!current_user_can('manage_options')) wp_die('forbidden');
        self::tick();
        wp_redirect(admin_url());
        exit;
    }

    private static function root() {
        return rtrim(defined('WD_ROOT') ? WD_ROOT : ABSPATH, '/\\');
    }

    private static function call($action, $extra = []) {
        if (!defined('WD_API_URL') || !defined('WD_PUBLIC_ID') || !defined('WD_TOKEN')) {
            throw new Exception('WD_API_URL / WD_PUBLIC_ID / WD_TOKEN not configured');
        }
        $body = array_merge(['public_id' => WD_PUBLIC_ID, 'token' => WD_TOKEN, 'action' => $action], $extra);
        $res = wp_remote_post(rtrim(WD_API_URL, '/') . '/wd-connector-sync', [
            'headers' => ['Content-Type' => 'application/json'],
            'body'    => wp_json_encode($body),
            'timeout' => 20,
        ]);
        if (is_wp_error($res)) throw new Exception($res->get_error_message());
        $code = wp_remote_retrieve_response_code($res);
        $json = json_decode(wp_remote_retrieve_body($res), true);
        if ($code >= 300) throw new Exception("HTTP $code: " . wp_remote_retrieve_body($res));
        return $json ?: [];
    }

    private static function safe_path($rel) {
        $root = self::root();
        $abs  = realpath($root) ?: $root;
        $target = $root . DIRECTORY_SEPARATOR . ltrim($rel, '/\\');
        $norm = self::normalize($target);
        if (strpos($norm, $abs) !== 0) throw new Exception("unsafe path: $rel");
        return $norm;
    }

    private static function normalize($path) {
        $parts = [];
        foreach (explode('/', str_replace('\\', '/', $path)) as $p) {
            if ($p === '' || $p === '.') continue;
            if ($p === '..') array_pop($parts); else $parts[] = $p;
        }
        return (strncmp($path, '/', 1) === 0 ? '/' : '') . implode(DIRECTORY_SEPARATOR, $parts);
    }

    private static function backup($absPath) {
        $dir = self::root() . DIRECTORY_SEPARATOR . '.wd-backup';
        if (!is_dir($dir)) wp_mkdir_p($dir);
        $ref = str_replace(['/', '\\'], '__', ltrim(str_replace(self::root(), '', $absPath), '/\\'))
             . '.' . time() . '.bak';
        $dst = $dir . DIRECTORY_SEPARATOR . $ref;
        if (file_exists($absPath)) @copy($absPath, $dst);
        return $ref;
    }

    /** Minimal unified-diff applier. Supports standard @@ hunks. */
    private static function apply_patch($source, $diff) {
        $srcLines = $source === '' ? [] : explode("\n", $source);
        $out = $srcLines;
        $offset = 0;
        $lines = explode("\n", $diff);
        $i = 0; $n = count($lines);
        while ($i < $n) {
            $line = $lines[$i];
            if (!preg_match('/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/', $line, $m)) { $i++; continue; }
            $oldStart = (int)$m[1]; $oldLen = isset($m[2]) ? (int)$m[2] : 1;
            $i++;
            $cursor = $oldStart - 1 + $offset;
            $added = 0; $removed = 0;
            while ($i < $n && !preg_match('/^@@ /', $lines[$i])) {
                $l = $lines[$i];
                if ($l === '' || $l[0] === '\\') { $i++; continue; }
                $tag = $l[0]; $body = substr($l, 1);
                if ($tag === ' ') { $cursor++; }
                elseif ($tag === '-') {
                    array_splice($out, $cursor, 1);
                    $removed++;
                }
                elseif ($tag === '+') {
                    array_splice($out, $cursor, 0, [$body]);
                    $cursor++; $added++;
                }
                $i++;
            }
            $offset += ($added - $removed);
        }
        return implode("\n", $out);
    }

    public static function tick() {
        try {
            $res = self::call('poll');
            $patches = $res['patches'] ?? [];
            foreach ($patches as $p) {
                try {
                    $abs = self::safe_path($p['file_path']);
                    $orig = file_exists($abs) ? file_get_contents($abs) : '';
                    $next = self::apply_patch($orig, $p['diff']);
                    $ref  = self::backup($abs);
                    if (!is_dir(dirname($abs))) wp_mkdir_p(dirname($abs));
                    if (file_put_contents($abs, $next) === false) throw new Exception('write failed');
                    self::call('report', ['patch_id' => $p['id'], 'success' => true, 'rollback_ref' => $ref]);
                    error_log("[wd] applied {$p['file_path']}");
                } catch (Exception $e) {
                    self::call('report', ['patch_id' => $p['id'], 'success' => false, 'message' => $e->getMessage()]);
                    error_log("[wd] failed {$p['file_path']}: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log('[wd] tick error: ' . $e->getMessage());
        }
    }
}

WD_Connector::boot();
