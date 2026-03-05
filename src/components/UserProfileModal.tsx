import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useUpdateUserProfile } from '@/hooks/use-user-profile';
import { User } from 'lucide-react';

const COUNTRY_PHONE_CODES: Record<string, string> = {
  US: '+1', CA: '+1', GB: '+44', DE: '+49', FR: '+33', AU: '+61',
  JP: '+81', IN: '+91', BR: '+55', MX: '+52', ES: '+34', IT: '+39',
  NL: '+31', SE: '+46', NO: '+47', DK: '+45', FI: '+358', CH: '+41',
  AT: '+43', BE: '+32', PT: '+351', IE: '+353', NZ: '+64', SG: '+65',
  KR: '+82', CN: '+86', TW: '+886', HK: '+852', IL: '+972', ZA: '+27',
  AE: '+971', PH: '+63', TH: '+66', MY: '+60', ID: '+62', VN: '+84',
  PL: '+48', CZ: '+420', RO: '+40', HU: '+36', GR: '+30', TR: '+90',
  RU: '+7', UA: '+380', AR: '+54', CL: '+56', CO: '+57', PE: '+51',
  NG: '+234', KE: '+254', EG: '+20', PK: '+92',
};

const COUNTRIES = Object.keys(COUNTRY_PHONE_CODES).sort();

// Edit mode schema with password fields
const editProfileSchema = z.object({
  phone: z.string().min(7, 'Phone number must be at least 7 digits')
    .regex(/^[\d\s\-().+]+$/, 'Phone number can only contain digits, spaces, dashes, and parentheses'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password.length >= 8;
  }
  return true;
}, {
  message: 'Password must be at least 8 characters',
  path: ['password'],
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: any; // Clerk user object
  profile: any; // SQLite profile data
}

export function UserProfileModal({ open, onClose, user, profile }: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateProfile = useUpdateUserProfile();

  // Detect if user signed up with OAuth (no password to change)
  const isOAuthUser = user?.externalAccounts?.length > 0 && user?.passwordEnabled === false;

  // Extract phone number without country code prefix for editing
  const rawPhone = profile?.phone || '';
  const phoneWithoutCode = rawPhone.replace(/^\+\d{1,4}\s*/, '');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onChange',
    defaultValues: {
      phone: phoneWithoutCode,
      city: profile?.city || '',
      state: profile?.state || '',
      postalCode: profile?.postalCode || '',
      country: profile?.country || 'US',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedCountry = watch('country');

  // Reset form when switching modes or when profile changes
  useEffect(() => {
    if (profile) {
      reset({
        phone: rawPhone.replace(/^\+\d{1,4}\s*/, ''),
        city: profile.city || '',
        state: profile.state || '',
        postalCode: profile.postalCode || '',
        country: profile.country || 'US',
        password: '',
        confirmPassword: '',
      });
    }
  }, [profile, isEditing, reset, rawPhone]);

  const handleCountryChange = (value: string) => {
    setValue('country', value, { shouldValidate: true });
  };

  const onSubmit = async (data: EditProfileFormData) => {
    const fullPhone = `${COUNTRY_PHONE_CODES[data.country] || ''} ${data.phone}`;

    // Update profile in SQLite
    await updateProfile.mutateAsync({
      phone: fullPhone,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
    });

    // Update password via Clerk if provided and user has password auth
    if (!isOAuthUser && data.password && data.password.length >= 8) {
      try {
        await user.updatePassword({ newPassword: data.password });
      } catch (err: any) {
        console.error('Failed to update password:', err);
      }
    }

    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const email = user?.primaryEmailAddress?.emailAddress || '';
  const fullName = user?.fullName || user?.firstName || '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white text-black rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-black flex items-center gap-2">
            <User className="w-5 h-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          /* ── View Mode ── */
          <div className="space-y-4">
            <ProfileField label="Name" value={fullName} />
            <ProfileField label="Email" value={email} />
            <ProfileField label="Password" value="**********" />
            <ProfileField label="Phone" value={profile?.phone || 'Not set'} />
            <ProfileField label="Country" value={profile?.country || 'Not set'} />
            <ProfileField label="City" value={profile?.city || 'Not set'} />
            <ProfileField label="State / Province" value={profile?.state || 'Not set'} />
            <ProfileField label="Postal Code" value={profile?.postalCode || 'Not set'} />

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
              >
                Edit Profile
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Edit Mode ── */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name & Email (read-only, managed by Clerk) */}
            <ProfileField label="Name" value={fullName} hint="Managed by Clerk" />
            <ProfileField label="Email" value={email} hint="Managed by Clerk" />

            {/* Password fields — only if NOT an OAuth user */}
            {!isOAuthUser && (
              <>
                <div className="space-y-1">
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password.message}</p>
                  )}
                  <Label htmlFor="password" className="text-black text-sm">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave blank to keep current"
                    className="bg-white text-black border-gray-300"
                    {...register('password')}
                  />
                </div>

                <div className="space-y-1">
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
                  )}
                  <Label htmlFor="confirmPassword" className="text-black text-sm">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    className="bg-white text-black border-gray-300"
                    {...register('confirmPassword')}
                  />
                </div>
              </>
            )}

            {/* Country */}
            <div className="space-y-1">
              {errors.country && (
                <p className="text-xs text-red-600">{errors.country.message}</p>
              )}
              <Label htmlFor="country" className="text-black text-sm">Country</Label>
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
            </div>

            {/* Phone */}
            <div className="space-y-1">
              {errors.phone && (
                <p className="text-xs text-red-600">{errors.phone.message}</p>
              )}
              <Label htmlFor="phone" className="text-black text-sm">Phone Number</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 min-w-[3rem]">
                  {COUNTRY_PHONE_CODES[selectedCountry] || '+1'}
                </span>
                <Input
                  id="phone"
                  placeholder="555-123-4567"
                  className="bg-white text-black border-gray-300"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1">
              {errors.city && (
                <p className="text-xs text-red-600">{errors.city.message}</p>
              )}
              <Label htmlFor="city" className="text-black text-sm">City</Label>
              <Input
                id="city"
                placeholder="City"
                className="bg-white text-black border-gray-300"
                {...register('city')}
              />
            </div>

            {/* State */}
            <div className="space-y-1">
              {errors.state && (
                <p className="text-xs text-red-600">{errors.state.message}</p>
              )}
              <Label htmlFor="state" className="text-black text-sm">State / Province</Label>
              <Input
                id="state"
                placeholder="State or Province"
                className="bg-white text-black border-gray-300"
                {...register('state')}
              />
            </div>

            {/* Postal Code */}
            <div className="space-y-1">
              {errors.postalCode && (
                <p className="text-xs text-red-600">{errors.postalCode.message}</p>
              )}
              <Label htmlFor="postalCode" className="text-black text-sm">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="Postal Code"
                className="bg-white text-black border-gray-300"
                {...register('postalCode')}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                className="border-gray-400 text-black hover:bg-gray-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || updateProfile.isPending}
                className={`font-semibold ${
                  isValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Read-only field display for view mode
function ProfileField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-gray-500 text-xs uppercase tracking-wide">{label}</Label>
        {hint && <span className="text-[10px] text-gray-400 italic">{hint}</span>}
      </div>
      <p className="text-black text-sm font-medium px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
        {value}
      </p>
    </div>
  );
}
