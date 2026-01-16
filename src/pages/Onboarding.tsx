import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateFirm } from '@/hooks/use-firm';

const firmSchema = z.object({
  name: z.string().min(2, 'Firm name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  practice_type: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
});

export default function Onboarding() {
  const navigate = useNavigate();
  const createFirm = useCreateFirm();

  const form = useForm<z.infer<typeof firmSchema>>({
    resolver: zodResolver(firmSchema),
    defaultValues: {
      name: '',
      website: '',
      practice_type: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof firmSchema>) => {
    await createFirm.mutateAsync({
      name: data.name,
      website: data.website || undefined,
      practice_type: data.practice_type || undefined,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone || undefined,
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <span className="text-xl font-bold text-accent-foreground">L</span>
          </div>
          <span className="text-2xl font-bold text-white">LeadsThru</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Set Up Your Firm</CardTitle>
            <CardDescription>
              Tell us about your law firm to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firm Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith & Associates" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourfirm.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="practice_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Mass Tort, Personal Injury" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@yourfirm.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createFirm.isPending}
                >
                  {createFirm.isPending ? 'Creating...' : 'Continue to Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
