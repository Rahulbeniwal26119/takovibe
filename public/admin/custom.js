// Ensure Decap CMS preserves quotes in YAML
if (typeof CMS !== 'undefined') {
  CMS.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      // Get entry data
      let data = entry.get('data').toJS();
      
      // Ensure all string fields remain strings
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Convert date objects to strings
        if (value instanceof Date) {
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          data[key] = `${year}-${month}-${day}`;
        }
        
        // Ensure URLs are strings
        if (key === 'canonical' || key === 'image') {
          if (value && typeof value === 'string') {
            data[key] = value.trim();
          }
        }
      });
      
      return data;
    }
  });
}
