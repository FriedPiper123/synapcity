import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const AreaOverviewSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-6 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-center">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-6 w-20 mx-auto mt-2" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const CategoryCardSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-16 mb-2" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="w-4 h-4" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const HistoricalChartSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-6 w-64" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="w-full h-80 overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    </CardContent>
  </Card>
);

export const InsightsSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-6 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-start gap-2">
                  <Skeleton className="w-1.5 h-1.5 rounded-full mt-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const NearbyAreasSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-6 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>
    </CardContent>
  </Card>
); 