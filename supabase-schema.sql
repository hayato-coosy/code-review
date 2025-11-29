-- Create sessions table
create table if not exists sessions (
  id text primary key,
  target_url text not null,
  created_at timestamp with time zone default now(),
  canvas_height integer default 3000
);

-- Create comments table
create table if not exists comments (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  message text not null,
  author_name text,
  pos_x numeric not null,
  pos_y numeric not null,
  width numeric,
  height numeric,
  category text not null,
  status text not null,
  viewport text,
  is_completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Create index on session_id for faster queries
create index if not exists comments_session_id_idx on comments(session_id);
