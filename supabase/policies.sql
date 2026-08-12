-- Row Level Security policies for public dashboard and admin portal

alter table stores enable row level security;
alter table pickups enable row level security;

create policy "Allow public reads on stores" on stores for select using (true);
create policy "Allow public reads on pickups" on pickups for select using (true);

create policy "Allow authenticated inserts on pickups" on pickups for insert using (auth.role() = 'authenticated');
create policy "Allow authenticated updates on pickups" on pickups for update using (auth.role() = 'authenticated');
create policy "Allow authenticated deletes on pickups" on pickups for delete using (auth.role() = 'authenticated');

create policy "Allow authenticated inserts on stores" on stores for insert using (auth.role() = 'authenticated');
create policy "Allow authenticated updates on stores" on stores for update using (auth.role() = 'authenticated');
create policy "Allow authenticated deletes on stores" on stores for delete using (auth.role() = 'authenticated');
