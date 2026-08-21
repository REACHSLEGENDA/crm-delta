import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { Contact, Note, Call, Deal } from "@/types";
import {
  Plus, Search, Phone, Mail, Landmark, X,
  Trash2, Edit3, Coins, Clock, BookOpen,
} from "lucide-react";

const initialsOf = (contact: Pick<Contact, "first_name" | "last_name">) =>
  `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase() || "·";

export const ContactosList = () => {
  const { profile } = useAuth();
  const { isAgent, isSupervisor, canDelete } = usePermissions();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Details & History Modal state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
  });

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

      if (isAgent && profile?.id) {
        query = query.eq("agent_id", profile.id);
      } else if (isSupervisor && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setContacts(data as Contact[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAgent, isSupervisor, profile?.id, profile?.team_id]);

  useEffect(() => {
    if (profile) {
      fetchContacts();
    }
  }, [fetchContacts, profile]);

  const handleOpenContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);

    // Fetch Notes, Calls & Deals simultaneously
    const [notesRes, callsRes, dealsRes] = await Promise.all([
      supabase.from("notes").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("calls").select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("deals").select("*").eq("lead_id", contact.id), // using lead_id or custom mapping
    ]);

    if (notesRes.data) setNotes(notesRes.data as Note[]);
    if (callsRes.data) setCalls(callsRes.data as Call[]);
    if (dealsRes.data) setDeals(dealsRes.data as Deal[]);
  };

  const handleSaveContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const payload = {
        ...formData,
        agent_id: profile.id,
        team_id: profile.team_id || null,
      };

      if (selectedContact?.id) {
        await supabase.from("contacts").update(payload).eq("id", selectedContact.id);
      } else {
        await supabase.from("contacts").insert(payload);
      }
      setIsFormOpen(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("¿Está seguro de eliminar este contacto?")) return;
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", contactId);
      if (!error) {
        setContacts(contacts.filter((c) => c.id !== contactId));
        if (selectedContact?.id === contactId) {
          setSelectedContact(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
           contact.email?.toLowerCase().includes(search.toLowerCase()) ||
           contact.company_name?.toLowerCase().includes(search.toLowerCase());
  });

  const inputClass = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";

  return (
    <div className="app-page flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Cartera de inversión</p>
          <h1 className="font-title text-2xl font-extrabold leading-none text-foreground sm:text-[1.9rem]">Directorio de Contactos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Cartera activa de clientes e inversores institucionales</p>
        </div>
        <button
          onClick={() => {
            setFormData({ first_name: "", last_name: "", email: "", phone: "", company_name: "" });
            setSelectedContact(null);
            setIsFormOpen(true);
          }}
          className="gold-button-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar contacto</span>
        </button>
      </header>

      {/* Search Filter */}
      <div className="relative w-full md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o institución…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid place-items-center gap-3 p-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-xs font-medium tracking-wider text-muted-foreground">Cargando cartera de inversión…</span>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="surface-card grid place-items-center gap-2 p-14 text-center text-sm text-muted-foreground">
          <BookOpen className="h-8 w-8 text-primary/40" />
          No hay contactos registrados todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleOpenContactDetails(contact)}
              className="surface-card surface-lift group flex cursor-pointer flex-col gap-4 p-5"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-display text-sm font-bold text-primary">
                  {initialsOf(contact)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-title text-base font-bold text-foreground">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  {contact.company_name && (
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
                      <Landmark className="h-3.5 w-3.5 shrink-0 text-primary" /> {contact.company_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedContact(contact);
                      setFormData({
                        first_name: contact.first_name,
                        last_name: contact.last_name,
                        email: contact.email,
                        phone: contact.phone,
                        company_name: contact.company_name,
                      });
                      setIsFormOpen(true);
                    }}
                    className="app-icon-button min-h-8 min-w-8"
                    aria-label={`Editar ${contact.first_name}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="app-icon-button min-h-8 min-w-8 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Eliminar ${contact.first_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                {contact.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="font-mono-numbers">{contact.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details & History Modal */}
      {selectedContact && !isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-4 backdrop-blur-sm">
          <div className="surface-card flex max-h-[90vh] w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 font-display font-bold text-primary">
                  {initialsOf(selectedContact)}
                </span>
                <div>
                  <h3 className="font-title text-xl font-extrabold text-foreground">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">{selectedContact.company_name || "Inversor individual"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="app-icon-button min-h-9 min-w-9"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Grid of details & histories */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left Column: Notes & Calls */}
              <div className="space-y-5">
                <section className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Notas comerciales
                  </h4>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {notes.map((n) => (
                      <div key={n.id} className="rounded-lg border border-border bg-background p-3 text-xs">
                        <p className="text-foreground">{n.content}</p>
                        <span className="mt-1 block font-mono-numbers text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleString("es-MX")}</span>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-xs italic text-muted-foreground">No hay notas registradas.</p>}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Historial de llamadas
                  </h4>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {calls.map((c) => (
                      <div key={c.id} className="flex justify-between gap-2 rounded-lg border border-border bg-background p-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{c.disposition}</p>
                          <p className="mt-0.5 text-muted-foreground">{c.notes || "Sin comentarios"}</p>
                        </div>
                        <span className="shrink-0 font-mono-numbers text-[10px] text-primary">{c.duration_seconds}s</span>
                      </div>
                    ))}
                    {calls.length === 0 && <p className="text-xs italic text-muted-foreground">No hay llamadas registradas.</p>}
                  </div>
                </section>
              </div>

              {/* Right Column: Deals */}
              <section className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-primary" /> Negociaciones del cliente
                </h4>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {deals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{d.name}</p>
                        <span className="text-[10px] text-muted-foreground">{d.stage}</span>
                      </div>
                      <span className="shrink-0 font-display text-sm font-bold text-primary">${Number(d.value).toLocaleString("es-MX")}</span>
                    </div>
                  ))}
                  {deals.length === 0 && <p className="text-xs italic text-muted-foreground">No hay negociaciones activas.</p>}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveContactSubmit} className="surface-card w-full max-w-md space-y-4 p-6">
            <h3 className="font-title text-lg font-extrabold text-foreground">
              {selectedContact?.id ? "Editar contacto" : "Agregar contacto"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Apellido</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Empresa / Institución</label>
              <input
                type="text"
                value={formData.company_name || ""}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="gold-button-secondary min-h-10 rounded-xl px-4 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gold-button-primary min-h-10 rounded-xl px-4 text-sm font-bold"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
