import React, { useEffect, useState } from 'react';

// LibraryManagementApp.jsx
// Single-file React component implementing a client-side Library Management System
// - Uses localStorage as a lightweight 'backend'
// - Features: Books (CRUD), Members (CRUD), Issue/Return, Search & Filters, CSV export, basic notifications
// - Tailwind is used for styling (assumes Tailwind is available in host project)

export default function LibraryManagementApp() {
  // --- Data models stored in localStorage ---
  const [books, setBooks] = useLocalStorage('lms_books', sampleBooks());
  const [members, setMembers] = useLocalStorage('lms_members', sampleMembers());
  const [transactions, setTransactions] = useLocalStorage('lms_transactions', []); // issue/return records

  // UI state
  const [view, setView] = useState('dashboard'); // dashboard | books | members | issue
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [notification, setNotification] = useState(null);

  // Form states for books and members
  const emptyBook = { id: '', title: '', author: '', isbn: '', copies: 1, category: '' };
  const emptyMember = { id: '', name: '', email: '', phone: '' };
  const [bookForm, setBookForm] = useState(emptyBook);
  const [memberForm, setMemberForm] = useState(emptyMember);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // --- Book CRUD ---
  function handleBookSave(e) {
    e?.preventDefault?.();
    if (!bookForm.title.trim()) return alert('Book title is required');
    if (bookForm.id) {
      // update
      setBooks(prev => prev.map(b => (b.id === bookForm.id ? { ...b, ...bookForm } : b)));
      setNotification('Book updated');
    } else {
      const newBook = { ...bookForm, id: genId('B') };
      setBooks(prev => [newBook, ...prev]);
      setNotification('Book added');
    }
    setBookForm(emptyBook);
  }

  function handleBookEdit(book) {
    setBookForm(book);
    setView('books');
  }

  function handleBookDelete(id) {
    if (!confirm('Delete this book?')) return;
    setBooks(prev => prev.filter(b => b.id !== id));
    // remove related transactions (optional)
    setTransactions(prev => prev.filter(t => t.bookId !== id));
    setNotification('Book deleted');
  }

  // --- Member CRUD ---
  function handleMemberSave(e) {
    e?.preventDefault?.();
    if (!memberForm.name.trim()) return alert('Member name required');
    if (memberForm.id) {
      setMembers(prev => prev.map(m => (m.id === memberForm.id ? { ...m, ...memberForm } : m)));
      setNotification('Member updated');
    } else {
      const nm = { ...memberForm, id: genId('M') };
      setMembers(prev => [nm, ...prev]);
      setNotification('Member added');
    }
    setMemberForm(emptyMember);
  }

  function handleMemberEdit(m) {
    setMemberForm(m);
    setView('members');
  }

  function handleMemberDelete(id) {
    if (!confirm('Delete this member? This will delete their transaction history.')) return;
    setMembers(prev => prev.filter(m => m.id !== id));
    setTransactions(prev => prev.filter(t => t.memberId !== id));
    setNotification('Member deleted');
  }

  // --- Issue / Return ---
  function issueBook(bookId, memberId, days = 14) {
    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);
    if (!book || !member) return alert('Invalid book or member');
    const available = getAvailableCopies(bookId);
    if (available < 1) return alert('No available copies to issue');
    const due = addDays(new Date(), days);
    const tx = { id: genId('T'), bookId, memberId, type: 'issue', date: new Date().toISOString(), dueDate: due.toISOString(), returned: false };
    setTransactions(prev => [tx, ...prev]);
    setNotification(`Issued "${book.title}" to ${member.name}. Due ${due.toLocaleDateString()}`);
  }

  function returnBook(transactionId) {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return;
    if (tx.type === 'issue' && !tx.returned) {
      const ret = { ...tx, type: 'return', returned: true, returnDate: new Date().toISOString() };
      // Mark original issue as returned
      setTransactions(prev => prev.map(p => (p.id === tx.id ? ret : p)));
      setNotification('Book returned');
    }
  }

  // --- Helpers ---
  function genId(prefix = 'X') {
    return prefix + '_' + Math.random().toString(36).slice(2, 9).toUpperCase();
  }

  function addDays(d, days) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  }

  function getAvailableCopies(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return 0;
    const issuedCount = transactions.filter(t => t.bookId === bookId && t.type === 'issue' && !t.returned).length;
    return Math.max(0, (Number(book.copies) || 0) - issuedCount);
  }

  // Search & Filter
  const filteredBooks = books.filter(b => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [b.title, b.author, b.isbn, b.category, b.id].some(f => (f || '').toString().toLowerCase().includes(q));
  });

  // Export CSV
  function exportCSV(list, filename = 'export.csv') {
    const keys = Object.keys(list[0] || {});
    const rows = [keys.join(','), ...list.map(obj => keys.map(k => `"${(obj[k] ?? '')}"`).join(','))].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Quick dashboard stats
  const totalBooks = books.length;
  const totalMembers = members.length;
  const totalIssued = transactions.filter(t => t.type === 'issue' && !t.returned).length;

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Library Management System</h1>
          <nav className="space-x-2">
            <button className={btn(view === 'dashboard')} onClick={() => setView('dashboard')}>Dashboard</button>
            <button className={btn(view === 'books')} onClick={() => setView('books')}>Books</button>
            <button className={btn(view === 'members')} onClick={() => setView('members')}>Members</button>
            <button className={btn(view === 'issue')} onClick={() => setView('issue')}>Issue / Return</button>
          </nav>
        </header>

        {notification && <div className="mb-4 p-3 bg-white rounded shadow">{notification}</div>}

        {view === 'dashboard' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card title="Books" value={totalBooks}>
              <p className="text-sm">Total titles stored</p>
              <div className="mt-2">
                <button className="text-sm underline" onClick={() => { setView('books'); }}>Manage books</button>
              </div>
            </Card>
            <Card title="Members" value={totalMembers}>
              <p className="text-sm">Registered library members</p>
            </Card>
            <Card title="Currently Issued" value={totalIssued}>
              <p className="text-sm">Active issued copies</p>
            </Card>
          </section>
        )}

        {view === 'books' && (
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Books</h2>
              <div className="flex items-center gap-2">
                <input className="border px-2 py-1 rounded" placeholder="Search books..." value={search} onChange={e => setSearch(e.target.value)} />
                <button className="px-3 py-1 border rounded" onClick={() => exportCSV(books, 'books.csv')}>Export CSV</button>
                <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => { setBookForm(emptyBook); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ New</button>
              </div>
            </div>

            <form className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2" onSubmit={handleBookSave}>
              <input className="col-span-2 border px-2 py-1 rounded" placeholder="Title" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} />
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="Author" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} />
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="ISBN" value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} />
              <input type="number" min="1" className="col-span-1 border px-2 py-1 rounded" placeholder="Copies" value={bookForm.copies} onChange={e => setBookForm({ ...bookForm, copies: e.target.value })} />
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="Category" value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })} />
              <div className="col-span-6 flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded" type="submit">Save</button>
                <button type="button" className="px-3 py-1 border rounded" onClick={() => setBookForm(emptyBook)}>Clear</button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">ID</th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Author</th>
                    <th className="p-2">Copies</th>
                    <th className="p-2">Available</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map(b => (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{b.id}</td>
                      <td className="p-2">{b.title}</td>
                      <td className="p-2">{b.author}</td>
                      <td className="p-2">{b.copies}</td>
                      <td className="p-2">{getAvailableCopies(b.id)}</td>
                      <td className="p-2">
                        <button className="mr-2 text-sm underline" onClick={() => handleBookEdit(b)}>Edit</button>
                        <button className="mr-2 text-sm underline" onClick={() => { setSelectedBook(b); setView('issue'); }}>Issue</button>
                        <button className="text-sm text-red-600" onClick={() => handleBookDelete(b.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === 'members' && (
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Members</h2>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => exportCSV(members, 'members.csv')}>Export CSV</button>
                <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => { setMemberForm(emptyMember); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ New</button>
              </div>
            </div>

            <form className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2" onSubmit={handleMemberSave}>
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="Name" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="Email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />
              <input className="col-span-1 border px-2 py-1 rounded" placeholder="Phone" value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} />
              <div className="col-span-4 flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded" type="submit">Save</button>
                <button type="button" className="px-3 py-1 border rounded" onClick={() => setMemberForm(emptyMember)}>Clear</button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">ID</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.id}</td>
                      <td className="p-2">{m.name}</td>
                      <td className="p-2">{m.email}</td>
                      <td className="p-2">{m.phone}</td>
                      <td className="p-2">
                        <button className="mr-2 text-sm underline" onClick={() => handleMemberEdit(m)}>Edit</button>
                        <button className="text-sm text-red-600" onClick={() => handleMemberDelete(m.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === 'issue' && (
          <section className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Issue / Return</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">Select Book</label>
                <select className="w-full border px-2 py-1 rounded" value={selectedBook?.id || ''} onChange={e => setSelectedBook(books.find(b => b.id === e.target.value) || null)}>
                  <option value="">-- choose --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} — {b.id} (Avail: {getAvailableCopies(b.id)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Select Member</label>
                <select className="w-full border px-2 py-1 rounded" value={selectedMember?.id || ''} onChange={e => setSelectedMember(members.find(m => m.id === e.target.value) || null)}>
                  <option value="">-- choose --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => { if (!selectedBook || !selectedMember) return alert('Select both'); issueBook(selectedBook.id, selectedMember.id); }}>Issue 14d</button>
                <button className="px-3 py-1 border rounded" onClick={() => { if (!selectedBook || !selectedMember) return alert('Select both'); issueBook(selectedBook.id, selectedMember.id, 7); }}>Issue 7d</button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Active Issues</h3>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Txn ID</th>
                      <th className="p-2">Book</th>
                      <th className="p-2">Member</th>
                      <th className="p-2">Due</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(t => t.type === 'issue' && !t.returned).map(t => {
                      const b = books.find(x => x.id === t.bookId) || {};
                      const m = members.find(x => x.id === t.memberId) || {};
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="p-2">{t.id}</td>
                          <td className="p-2">{b.title || t.bookId}</td>
                          <td className="p-2">{m.name || t.memberId}</td>
                          <td className="p-2">{new Date(t.dueDate).toLocaleDateString()}</td>
                          <td className="p-2">
                            <button className="mr-2 text-sm underline" onClick={() => returnBook(t.id)}>Return</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-6 text-sm text-gray-600 text-center">Made by <b>Rajat Singh</b> • Simple LMS • Data saved in browser storage</footer>
      </div>
    </div>
  );
}


// ----------------------
// Small UI helpers & subcomponents
// ----------------------
function Card({ title, value, children }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-2 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function btn(active) {
  const base = 'px-3 py-1 rounded';
  return active ? base + ' bg-indigo-600 text-white' : base + ' border';
}

// useLocalStorage hook
function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (e) {
      console.error('localStorage read', e);
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('localStorage write', e);
    }
  }, [key, state]);
  return [state, setState];
}

// Sample seed data
function sampleBooks() {
  return [
    { id: 'B_ABC1234', title: 'Introduction to Algorithms', author: 'Cormen, Leiserson et al.', isbn: '0262033844', copies: 3, category: 'Algorithms' },
    { id: 'B_DEF5678', title: 'Clean Code', author: 'Robert C. Martin', isbn: '0132350882', copies: 2, category: 'Software Engineering' },
    { id: 'B_GHI9012', title: 'Discrete Mathematics', author: 'Rosen', isbn: '0073383090', copies: 2, category: 'Mathematics' },
  ];
}
function sampleMembers() {
  return [
    { id: 'M_111AAAA', name: 'Rajat Singh', email: 'rajat@example.com', phone: '9999999999' },
    { id: 'M_222BBBB', name: 'Anita Sharma', email: 'anita@example.com', phone: '8888888888' },
  ];
}
