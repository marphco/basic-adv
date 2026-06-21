// Client API isolato per i Piani Editoriali.
// Usa lo stesso schema di auth/base URL del resto della dashboard (token in
// localStorage + VITE_API_URL). Normalizza gli _id di Mongo in `id` e mappa
// `clientNotes` (DB) ↔ `notes` (UI) per non cambiare il resto del componente.
import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(
  /\/$/,
  ""
);
const auth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const normClient = (c) =>
  c && {
    ...c,
    id: c._id,
    pages: (c.pages || []).map((p) => ({ ...p, id: p._id })),
  };
const normPost = (p) => p && { ...p, id: p._id, notes: p.clientNotes || [] };
const normUser = (u) => u && { ...u, id: u._id };

export const api = {
  // --- clienti ---
  listClients: () =>
    axios
      .get(`${API_URL}/api/editorial/clients`, auth())
      .then((r) => r.data.map(normClient)),
  createClient: (data) =>
    axios
      .post(`${API_URL}/api/editorial/clients`, data, auth())
      .then((r) => normClient(r.data)),
  updateClient: (id, data) =>
    axios
      .put(`${API_URL}/api/editorial/clients/${id}`, data, auth())
      .then((r) => normClient(r.data)),
  deleteClient: (id) =>
    axios.delete(`${API_URL}/api/editorial/clients/${id}`, auth()).then((r) => r.data),
  // invia per email il piano del mese a tutti i destinatari del cliente
  shareMonth: (body) =>
    axios
      .post(`${API_URL}/api/editorial/share`, body, auth())
      .then((r) => r.data),
  // invia il piano "per revisione" agli admin assegnati (link alla dashboard)
  shareAdmin: (body) =>
    axios
      .post(`${API_URL}/api/editorial/share-admin`, body, auth())
      .then((r) => r.data),
  // stato approvazione del piano (cliente) per un mese
  getApproval: (clientId, year, month) =>
    axios
      .get(`${API_URL}/api/editorial/approval`, {
        params: { clientId, year, month },
        ...auth(),
      })
      .then((r) => r.data),

  // --- post ---
  listPosts: (clientId, year, month) =>
    axios
      .get(`${API_URL}/api/editorial/posts`, {
        params: { clientId, year, month },
        ...auth(),
      })
      .then((r) => r.data.map(normPost)),
  createPost: (data) =>
    axios
      .post(`${API_URL}/api/editorial/posts`, data, auth())
      .then((r) => normPost(r.data)),
  updatePost: (id, data) =>
    axios
      .put(`${API_URL}/api/editorial/posts/${id}`, data, auth())
      .then((r) => normPost(r.data)),
  deletePost: (id) =>
    axios.delete(`${API_URL}/api/editorial/posts/${id}`, auth()).then((r) => r.data),
  // carica foto/video dei post → ritorna [{kind,url,thumbUrl}] con URL assoluti
  uploadMedia: (files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    return axios
      .post(`${API_URL}/api/editorial/media`, fd, auth())
      .then((r) => r.data.media);
  },
  duplicateMonth: (body) =>
    axios
      .post(`${API_URL}/api/editorial/duplicate-month`, body, auth())
      .then((r) => r.data.map(normPost)),
  dedupeMonth: (body) =>
    axios
      .post(`${API_URL}/api/editorial/dedupe-month`, body, auth())
      .then((r) => r.data),

  // --- utenti (admin) ---
  listUsers: () =>
    axios.get(`${API_URL}/api/users`, auth()).then((r) => r.data.map(normUser)),
  createUser: (data) =>
    axios.post(`${API_URL}/api/users`, data, auth()).then((r) => normUser(r.data)),
  updateUser: (id, data) =>
    axios.put(`${API_URL}/api/users/${id}`, data, auth()).then((r) => normUser(r.data)),
  deleteUser: (id) =>
    axios.delete(`${API_URL}/api/users/${id}`, auth()).then((r) => r.data),
};
