-- Enable Row Level Security
alter table sessions enable row level security;
alter table comments enable row level security;

-- Create policies that deny all access by default for public/anon users
-- Note: Service Role Key bypasses RLS automatically, so no policy is needed for it.
-- These policies ensure that even if someone gets the Anon Key, they can't do anything.

create policy "Deny all access to sessions for anon"
on sessions
for all
to anon
using (false);

create policy "Deny all access to comments for anon"
on comments
for all
to anon
using (false);
