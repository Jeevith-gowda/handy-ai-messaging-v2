'use client';

import { useEffect, useState } from 'react';
import PriceBookModal from '@/components/PriceBookModal';

const SERVICE_TYPES = ['plumbing', 'electrical', 'carpentry', 'painting', 'general', 'remodeling', 'hvac', 'other'];

/** Concatenate parts for the existing single `address` string in the DB (no migration). */
function buildStoredAddress({ street, city, state, zip }) {
  const s = (street || '').trim();
  const c = (city || '').trim();
  const st = (state || '').trim();
  const z = (zip || '').trim();
  const stateZip = [st, z].filter(Boolean).join(' ').trim();
  const segments = [s, c, stateZip].filter(Boolean);
  if (segments.length === 0) return undefined;
  return segments.join(', ');
}

const addressInputClass =
  'w-full min-h-[48px] px-4 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900';

function AddressFieldsGroup({ idPrefix, street, city, state, zip, onChange }) {
  const pid = (name) => (idPrefix ? `${idPrefix}-${name}` : name);
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={pid('street')} className="block text-sm font-medium text-gray-700 mb-1">
          Street address
        </label>
        <input
          id={pid('street')}
          type="text"
          autoComplete="street-address"
          value={street}
          onChange={(e) => onChange('street', e.target.value)}
          placeholder="123 Main Street, Apt 4"
          className={addressInputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor={pid('city')} className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            id={pid('city')}
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="Charlotte"
            className={addressInputClass}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor={pid('state')} className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <input
            id={pid('state')}
            type="text"
            autoComplete="address-level1"
            value={state}
            onChange={(e) => onChange('state', e.target.value)}
            placeholder="NC"
            className={addressInputClass}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor={pid('zip')} className="block text-sm font-medium text-gray-700 mb-1">
            ZIP code
          </label>
          <input
            id={pid('zip')}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            onChange={(e) => onChange('zip', e.target.value)}
            placeholder="28202"
            className={addressInputClass}
          />
        </div>
      </div>
    </div>
  );
}

export default function CreateProjectModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [handymen, setHandymen] = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [showPriceBook, setShowPriceBook] = useState(false);

  const [form, setForm] = useState({
    title: '',
    customerId: '',
    handymanId: '',
    description: '',
    serviceType: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    jobSiteContactName: '',
    jobSiteContactPhone: '',
    quoteLabour: '',
    quoteMaterials: '',
    quoteOther: '',
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then((r) => r.ok ? r.json() : []),
      fetch('/api/users?role=handyman').then((r) => r.ok ? r.json() : []),
    ]).then(([c, h]) => {
      setCustomers(c);
      setHandymen(h);
    });
  }, []);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const previews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setPhotos((prev) => [...prev, ...previews]);

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setPhotoUrls((prev) => [...prev, ...data.urls]);
      } else {
        const err = await res.json();
        setError(err.error || 'Photo upload failed');
      }
    } catch (err) {
      setError('Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let customerId = form.customerId;

      if (showNewCustomer) {
        if (!newCustomer.name || !newCustomer.phone) {
          setError('New customer needs at least a name and phone number');
          setSaving(false);
          return;
        }
        const customerPayload = {
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: buildStoredAddress(newCustomer),
        };
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerPayload),
        });
        if (!custRes.ok) {
          const err = await custRes.json();
          throw new Error(err.error || 'Failed to create customer');
        }
        const cust = await custRes.json();
        customerId = cust._id;
      }

      if (!customerId) {
        setError('Please select or create a customer');
        setSaving(false);
        return;
      }

      if (!form.title) {
        setError('Project title is required');
        setSaving(false);
        return;
      }

      const labour = form.quoteLabour ? Number(form.quoteLabour) : 0;
      const materials = form.quoteMaterials ? Number(form.quoteMaterials) : 0;
      const other = form.quoteOther ? Number(form.quoteOther) : 0;
      const totalQuote = labour + materials + other;

      const projectData = {
        title: form.title,
        customerId,
        description: form.description,
        serviceType: form.serviceType || undefined,
        address: buildStoredAddress(form),
        jobSiteContactName: form.jobSiteContactName || undefined,
        jobSiteContactPhone: form.jobSiteContactPhone || undefined,
        quoteBreakdown: totalQuote > 0 ? { labour, materials, other } : undefined,
        quoteAmount: totalQuote > 0 ? totalQuote : undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      };

      if (form.handymanId) {
        projectData.handymanId = form.handymanId;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }

      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
      <div className="fixed inset-0 bg-gray-600/75" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="e.g. Kitchen Faucet Replacement"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              required
            />
          </div>

          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Customer *</label>
              <button
                type="button"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {showNewCustomer ? 'Select existing' : '+ New customer'}
              </button>
            </div>

            {showNewCustomer ? (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="text"
                  placeholder="Customer name *"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
                <input
                  type="tel"
                  placeholder="Phone number *"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
                <p className="text-xs font-medium text-gray-600">Customer address (optional)</p>
                <AddressFieldsGroup
                  idPrefix="new-cust"
                  street={newCustomer.street}
                  city={newCustomer.city}
                  state={newCustomer.state}
                  zip={newCustomer.zip}
                  onChange={(field, value) => setNewCustomer((p) => ({ ...p, [field]: value }))}
                />
              </div>
            ) : (
              <select
                value={form.customerId}
                onChange={(e) => updateForm('customerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service Type + Handyman Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                value={form.serviceType}
                onChange={(e) => updateForm('serviceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Select type</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Handyman</label>
              <select
                value={form.handymanId}
                onChange={(e) => updateForm('handymanId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Unassigned</option>
                {handymen.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} — {h.skills?.join(', ')} ({h.availability})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="Describe the work needed..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
            <div className="space-y-3">
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group w-20 h-20">
                      <img
                        src={photo.preview}
                        alt={photo.name}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {uploading && idx >= photoUrls.length && (
                        <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Add photos'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Job site address — stored as one string on the project */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Job site address</p>
            <AddressFieldsGroup
              idPrefix="job-site"
              street={form.street}
              city={form.city}
              state={form.state}
              zip={form.zip}
              onChange={(field, value) => updateForm(field, value)}
            />
          </div>

          {/* Job Site Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Site Contact Name</label>
              <input
                type="text"
                value={form.jobSiteContactName}
                onChange={(e) => updateForm('jobSiteContactName', e.target.value)}
                placeholder="e.g. Building manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Site Contact Phone</label>
              <input
                type="tel"
                value={form.jobSiteContactPhone}
                onChange={(e) => updateForm('jobSiteContactPhone', e.target.value)}
                placeholder="+1 704 555 1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
            </div>
          </div>

          {/* Quote Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Quote Breakdown ($)</label>
              <button
                type="button"
                onClick={() => setShowPriceBook(true)}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Price Book"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                View Price Book
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="number"
                  value={form.quoteLabour}
                  onChange={(e) => updateForm('quoteLabour', e.target.value)}
                  placeholder="Labour"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={form.quoteMaterials}
                  onChange={(e) => updateForm('quoteMaterials', e.target.value)}
                  placeholder="Materials"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={form.quoteOther}
                  onChange={(e) => updateForm('quoteOther', e.target.value)}
                  placeholder="Other"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                />
              </div>
            </div>
            {(form.quoteLabour || form.quoteMaterials || form.quoteOther) && (
              <p className="text-xs text-gray-500 mt-1">
                Total: ${(parseFloat(form.quoteLabour) || 0) + (parseFloat(form.quoteMaterials) || 0) + (parseFloat(form.quoteOther) || 0)}
              </p>
            )}
          </div>

          {showPriceBook && (
            <PriceBookModal
              onClose={() => setShowPriceBook(false)}
              onSelectPrice={(price) => {
                const current = parseFloat(form.quoteLabour) || 0;
                updateForm('quoteLabour', String(current + price));
              }}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : uploading ? 'Uploading photos...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
