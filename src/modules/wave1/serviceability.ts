import { haversineDistanceKm, money } from "./utils";

type Coordinate = { latitude: unknown; longitude: unknown };
type ServiceabilityInput = {
  fulfilmentType: string;
  merchant: Coordinate;
  branch?: Partial<Coordinate> | null;
  customer: Partial<Coordinate>;
  deliveryRadiusKm?: unknown;
};

function numericCoordinate(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function deliveryServiceability(input: ServiceabilityInput) {
  if (input.fulfilmentType !== "DELIVERY") {
    return { required: false, distanceKm: null, deliveryRadiusKm: null, isWithinDeliveryRadius: true };
  }
  const originLatitude = numericCoordinate(input.merchant.latitude) ?? numericCoordinate(input.branch?.latitude);
  const originLongitude = numericCoordinate(input.merchant.longitude) ?? numericCoordinate(input.branch?.longitude);
  const customerLatitude = numericCoordinate(input.customer.latitude);
  const customerLongitude = numericCoordinate(input.customer.longitude);
  const deliveryRadiusKm = money(input.deliveryRadiusKm as string | number | null | undefined);
  if (originLatitude == null || originLongitude == null || customerLatitude == null || customerLongitude == null || !deliveryRadiusKm) {
    return { required: true, distanceKm: null, deliveryRadiusKm: deliveryRadiusKm || null, isWithinDeliveryRadius: null };
  }
  const distanceKm = haversineDistanceKm(
    { latitude: originLatitude, longitude: originLongitude },
    { latitude: customerLatitude, longitude: customerLongitude },
  );
  return {
    required: true,
    distanceKm,
    deliveryRadiusKm,
    isWithinDeliveryRadius: distanceKm <= deliveryRadiusKm,
  };
}
