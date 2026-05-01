export  const dateName = (name: string) => {
        const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        const validName = name.replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid filename chars with underscore
        return `${currentDate}_${validName}`
      }