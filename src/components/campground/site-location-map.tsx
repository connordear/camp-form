import { type MapSite, SiteMap } from "@/components/campground/site-map";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SiteLocationMapProps {
  sites: MapSite[];
  siteId: string;
}

/** "Where is my site": the map with one site highlighted, nothing to click. */
export function SiteLocationMap({ sites, siteId }: SiteLocationMapProps) {
  const site = sites.find((s) => s.id === siteId);
  if (!site || site.mapX === null || site.mapY === null) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where it is</CardTitle>
        <CardDescription>
          {site.name} is highlighted on the campground map.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SiteMap
          sites={sites.map(({ id, name, features, mapX, mapY }) => ({
            id,
            name,
            features,
            mapX,
            mapY,
          }))}
          selectedId={siteId}
          label={`Campground map with ${site.name} highlighted.`}
        />
      </CardContent>
    </Card>
  );
}
