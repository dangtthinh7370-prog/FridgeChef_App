alter table public.profiles
  add column if not exists food_likes text not null default '' check (char_length(food_likes) <= 500),
  add column if not exists food_limits text not null default '' check (char_length(food_limits) <= 500),
  add column if not exists food_dislikes text not null default '' check (char_length(food_dislikes) <= 500);
