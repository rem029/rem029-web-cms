import { CollectionConfig } from 'payload'

export const Analytics: CollectionConfig = {
  slug: 'analytics',
  admin: { useAsTitle: 'pagePath' },
  access: { read: () => true, create: () => true }, // Adjust as needed
  fields: [
    { name: 'ip', type: 'text', label: 'IP Address' },
    { name: 'email', type: 'email', label: 'Email', required: false },
    { name: 'phone', type: 'text', label: 'Phone', required: false },
    {
      name: 'deviceType',
      type: 'select',
      options: ['desktop', 'mobile', 'tablet'],
      required: true,
    },
    { name: 'pagePath', type: 'text', label: 'Page Path', required: true },
    { name: 'referrer', type: 'text', label: 'Referrer', required: false },
    { name: 'clickedUrl', type: 'text', label: 'Clicked URL', required: false },
    {
      name: 'eventType',
      type: 'select',
      label: 'Event Type',
      required: true,
      options: [
        { label: 'Page View', value: 'page_view' },
        { label: 'Click', value: 'click' },
        { label: 'Form Submission', value: 'form_submission' },
        { label: 'Error', value: 'error' },
        { label: 'Unknown', value: 'unknown' },
      ],
    },
    {
      name: 'timestamp',
      type: 'date',
      label: 'Timestamp',
      required: true,
      defaultValue: () => new Date(),
    },
    // Flexible JSON field for additional analytics data
    { name: 'payload', type: 'json', label: 'Additional Payload', required: false },
  ],
}
