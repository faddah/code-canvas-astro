import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUserProfile } from '@/hooks/use-user-profile';

const COUNTRY_PHONE_CODES: Record<string, string> = {
  US: '+1',
  CA: '+1',
  GB: '+44',
  DE: '+49',
  FR: '+33',
  AU: '+61',
  JP: '+81',
  IN: '+91',
  BR: '+55',
  MX: '+52',
  ES: '+34',
  IT: '+39',
  NL: '+31',
  SE: '+46',
  NO: '+47',
  DK: '+45',
  FI: '+358',
  CH: '+41',
  AT: '+43',
  BE: '+32',
  PT: '+351',
  IE: '+353',
  NZ: '+64',
  SG: '+65',
  KR: '+82',
  CN: '+86',
  TW: '+886',
  HK: '+852',
  IL: '+972',
  ZA: '+27',
  AE: '+971',
  PH: '+63',
  TH: '+66',
  MY: '+60',
  ID: '+62',
  VN: '+84',
  PL: '+48',
  CZ: '+420',
  RO: '+40',
  HU: '+36',
  GR: '+30',
  TR: '+90',
  RU: '+7',
  UA: '+380',
  AR: '+54',
  CL: '+56',
  CO: '+57',
  PE: '+51',
  NG: '+234',
  KE: '+254',
  EG: '+20',
  PK: '+92',
};

const COUNTRIES = Object.keys(COUNTRY_PHONE_CODES).sort();

const profileSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CompleteProfileProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function CompleteProfile({ onComplete, onCancel }: CompleteProfileProps) {
  const createProfile = useCreateUserProfile();
  const [selectedCountry, setSelectedCountry] = useState('US');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      country: 'US',
      phone: '',
      city: '',
      state: '',
      postalCode: '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    const fullPhone = `${COUNTRY_PHONE_CODES[data.country] || ''} ${data.phone}`;
    await createProfile.mutateAsync({
      ...data,
      phone: fullPhone,
    });
    onComplete();
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setValue('country', value);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className="sm:max-w-md bg-white text-black rounded-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-black">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-gray-600">
            Please fill in your profile information to start saving files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-black">Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="bg-white text-black border-gray-300">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                {COUNTRIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} ({COUNTRY_PHONE_CODES[code]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-600">{errors.country.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-black">Phone Number</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500 min-w-12">
                {COUNTRY_PHONE_CODES[selectedCountry] || '+1'}
              </span>
              <Input
                id="phone"
                placeholder="555-123-4567"
                className="bg-white text-black border-gray-300"
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-black">City</Label>
            <Input
              id="city"
              placeholder="City"
              className="bg-white text-black border-gray-300"
              {...register('city')}
            />
            {errors.city && (
              <p className="text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-black">State / Province</Label>
            <Input
              id="state"
              placeholder="State or Province"
              className="bg-white text-black border-gray-300"
              {...register('state')}
            />
            {errors.state && (
              <p className="text-sm text-red-600">{errors.state.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode" className="text-black">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="Postal Code"
              className="bg-white text-black border-gray-300"
              {...register('postalCode')}
            />
            {errors.postalCode && (
              <p className="text-sm text-red-600">{errors.postalCode.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createProfile.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {createProfile.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
