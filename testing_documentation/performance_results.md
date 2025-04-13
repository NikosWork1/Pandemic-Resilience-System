# Performance Test Results

## Page Load Performance

### Login Page
- **Total Requests**: 5 requests
- **Page Size**: 78.2 kB
- **DOMContentLoaded**: 64 ms
- **Load Time**: 87 ms
- **Render Start**: [The time in ms when the page starts rendering the content]
- **Largest Contentful Paint**: 91 ms

### Registration Page
- **Total Requests**: 5 requests
- **Page Size**: 47.9 kB
- **DOMContentLoaded**: 53 ms
- **Load Time**: 78 ms
- **Render Start**: [The time in ms when the page starts rendering the content]
- **Largest Contentful Paint**: 59 ms

### Dashboard Page
- **Total Requests**: 8 requests
- **Page Size**: 146 kB
- **DOMContentLoaded**: 59 ms
- **Load Time**: 83 ms
- **Render Start**: [The time in ms when the page starts rendering the content]
- **Largest Contentful Paint**: 104 ms

### Observations
- All pages load within acceptable time limits (under 1 second).
- The **Login Page** has the fastest load time, with a total page size of 78.2 kB.
- The **Dashboard Page** has a slightly larger size but still loads efficiently, taking 83 ms for a full page load.

### Recommendations
- **Consider optimizing large images** (if any) or reducing their file size to minimize the page load time, especially for dashboards with charts.
- **Enable server-side caching** for better performance on repeat visits.
- **Use lazy loading** for non-critical images or content that doesn’t need to load immediately.
