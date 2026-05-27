
// Audit Phase 1.F (F-2c): direct file imports to bypass the ui barrel.
import { Separator } from '../../ui/Separator';
import { Skeleton } from '../../ui/Skeleton';

export default function SettingsContentSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="w-full flex flex-col lg:flex-row lg:gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 pb-2 px-6 lg:w-1/2 flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* User Info Form Fields */}
        <div className="flex-1 px-6 overflow-auto lg:w-1/2 space-y-6">
          {/* First Name Field */}
          <div className="grid grid-cols-1 gap-3 py-3 w-full border-b border-border">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>

          {/* Last Name Field */}
          <div className="grid grid-cols-1 gap-3 py-3 w-full border-b border-border">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>

          {/* Email Field */}
          <div className="grid grid-cols-1 gap-3 py-3 w-full border-b border-border">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
        </div>
      </div>
        {/* Edit Button */}
        <div className="flex justify-center mt-6 w-full m-auto">
        <Skeleton className="h-10 w-24" />
        </div>
      <Separator />
    </div>
  );
}