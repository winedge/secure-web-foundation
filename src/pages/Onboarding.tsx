import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ArrowRight, Globe, Mail, Phone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateFirm } from '@/hooks/use-firm';

const firmSchema = z.object({
  name: z.string().min(2, 'Firm name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  practice_type: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
});

type FirmFormData = z.infer<typeof firmSchema>;

export default function Onboarding() {
  const navigate = useNavigate();
  const createFirm = useCreateFirm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirmFormData>({
    resolver: zodResolver(firmSchema),
    defaultValues: {
      name: '',
      website: '',
      practice_type: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const onSubmit = async (data: FirmFormData) => {
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
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-accent">
            <span className="text-lg sm:text-xl font-bold text-accent-foreground">L</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-white">LeadsThru</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-4 sm:pb-6">
              <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Set Up Your Firm</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Tell us about your law firm to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Firm Name - Required */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Firm Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name"
                    placeholder="Smith & Associates"
                    className="h-11"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Website
                  </label>
                  <Input
                    id="website"
                    placeholder="https://yourfirm.com"
                    className="h-11"
                    {...register('website')}
                  />
                  {errors.website && (
                    <p className="text-sm text-destructive">{errors.website.message}</p>
                  )}
                </div>

                {/* Practice Type */}
                <div className="space-y-2">
                  <label htmlFor="practice_type" className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Practice Type
                  </label>
                  <Input
                    id="practice_type"
                    placeholder="Mass Tort, Personal Injury"
                    className="h-11"
                    {...register('practice_type')}
                  />
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <label htmlFor="contact_email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Contact Email
                  </label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="contact@yourfirm.com"
                    className="h-11"
                    {...register('contact_email')}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <label htmlFor="contact_phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Contact Phone
                  </label>
                  <Input
                    id="contact_phone"
                    placeholder="(555) 123-4567"
                    className="h-11"
                    {...register('contact_phone')}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 text-base mt-6"
                  disabled={createFirm.isPending}
                >
                  {createFirm.isPending ? 'Creating...' : 'Continue to Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-white/60 text-xs sm:text-sm mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
