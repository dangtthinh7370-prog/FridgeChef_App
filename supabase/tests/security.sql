-- Run in SQL Editor after the migration. All fixtures are rolled back.
-- These are disposable synthetic users; they are NOT login credentials.
begin;
insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','fridgechef-rls-a@example.invalid'),
 ('b0000000-0000-4000-8000-000000000002','fridgechef-rls-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.food_items(id,name,quantity,unit,"storageAreaId","purchasedAt","expiresAt") values
 ('c0000000-0000-4000-8000-000000000003','RLS test',2,'quả','cool','2026-11-13','2026-11-20');
insert into public.shopping_items(id,name,quantity,unit,bought) values
 ('d0000000-0000-4000-8000-000000000004','Đi chợ A',1,'hộp',true);

select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
do $$
declare n integer;
begin
  if exists(select 1 from public.food_items) then raise exception 'FAIL: B sees A foods'; end if;
  if exists(select 1 from public.shopping_items) then raise exception 'FAIL: B sees A shopping'; end if;
  update public.food_items set name='hacked' where id='c0000000-0000-4000-8000-000000000003';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updates A'; end if;
  delete from public.shopping_items where id='d0000000-0000-4000-8000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deletes A'; end if;
  begin
    insert into public.shopping_items(user_id,name,quantity,unit) values('a0000000-0000-4000-8000-000000000001','forged',1,'hộp');
    raise exception 'FAIL: forged ownership allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.move_bought_to_fridge('[{"shoppingId":"d0000000-0000-4000-8000-000000000004","quantity":1,"unit":"hộp","storageAreaId":"cool","purchasedAt":"2026-11-13","expiresAt":"2026-11-20"}]');
    raise exception 'FAIL: B transfers A';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
insert into public.shopping_items(id,name,quantity,unit,bought) values
 ('e0000000-0000-4000-8000-000000000005','Đi chợ B',2,'kg',true);
do $$
declare moved integer; result jsonb;
begin
  begin
    perform public.move_bought_to_fridge('[{"shoppingId":"d0000000-0000-4000-8000-000000000004","quantity":1,"unit":"hộp","storageAreaId":"cool","purchasedAt":"2026-11-13","expiresAt":"2026-11-20"},{"shoppingId":"e0000000-0000-4000-8000-000000000005","quantity":2,"unit":"kg","storageAreaId":"dry","purchasedAt":"2026-11-13","expiresAt":"2026-11-12"}]');
    raise exception 'FAIL: invalid transfer accepted';
  exception when check_violation then null;
  end;
  if (select count(*) from public.shopping_items) <> 2 then raise exception 'FAIL: shopping not rolled back'; end if;
  if (select count(*) from public.food_items) <> 1 then raise exception 'FAIL: food not rolled back'; end if;
  moved := public.move_bought_to_fridge('[{"shoppingId":"d0000000-0000-4000-8000-000000000004","quantity":3,"unit":"hộp","storageAreaId":"cool","purchasedAt":"2026-11-13","expiresAt":"2026-11-20"},{"shoppingId":"e0000000-0000-4000-8000-000000000005","quantity":0.5,"unit":"kg","storageAreaId":"dry","purchasedAt":"2026-11-13","expiresAt":"2026-12-01"}]');
  if moved <> 2 or exists(select 1 from public.shopping_items) then raise exception 'FAIL: valid transfer'; end if;
  if not exists(select 1 from public.food_items where name='Đi chợ B' and quantity=0.5 and "storageAreaId"='dry' and "expiresAt"='2026-12-01') then raise exception 'FAIL: per item fields'; end if;
  result := public.import_legacy_fridge('security-test','[]','[{"legacyId":"1","name":"Nhập cũ","quantity":1,"unit":"hộp","bought":false}]');
  if (result->>'shopping')::integer <> 1 then raise exception 'FAIL: first import'; end if;
  result := public.import_legacy_fridge('security-test','[]','[{"legacyId":"1","name":"Nhập cũ","quantity":1,"unit":"hộp","bought":false}]');
  if not (result->>'alreadyImported')::boolean then raise exception 'FAIL: repeated import'; end if;
  delete from public.shopping_items where name='Nhập cũ';
  perform public.import_legacy_fridge('security-test','[]','[{"legacyId":"1","name":"Nhập cũ","quantity":1,"unit":"hộp","bought":false}]');
  if exists(select 1 from public.shopping_items) then raise exception 'FAIL: reimport resurrects deleted item'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: account isolation, forged ownership blocked, atomic transfer, per-item fields, idempotent import' as result;
