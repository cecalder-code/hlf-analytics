export interface Store {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  active: boolean;
}

export interface Pickup {
  id: string;
  pickup_date: string;
  store_id: string;
  scg_mass_lbs: number;
  cardboard_lbs: number;
  food_waste_lbs: number;
  miles_driven: number;
  number_of_days_between_pickups: number;
  pickup_initiated_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
