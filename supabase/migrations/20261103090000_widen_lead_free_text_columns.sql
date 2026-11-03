-- Delta Capital CRM: stop imports failing on a long "fuente" value.
--
-- leads.source was varchar(100), from a time when a source was a short tag
-- ("Facebook", "Referido"). The sheets the team actually imports put whatever
-- the prospect said in that column -- one row in base_invierte_mexico031126
-- carries 118 characters of what the person wants to invest in. Postgres
-- rejected it, and because a batch is inserted as one statement, that single
-- row failed all 17.
--
-- These columns hold whatever the source sheet carries, so they get text:
-- a length limit here only ever breaks an import, it never protects anything.

begin;

alter table public.leads
  alter column source type text,
  alter column investment_capacity type text,
  alter column phone type text,
  alter column email type text,
  alter column first_name type text,
  alter column last_name type text;

commit;
