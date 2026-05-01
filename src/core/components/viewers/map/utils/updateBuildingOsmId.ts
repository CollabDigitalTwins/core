export const updateBuildingOsmId = async (buildingId: number, osmId: number) => {
  try {
    const response = await fetch(`/api/buildings/${buildingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingOsmId: osmId }),
    })

    if (!response.ok) throw new Error('Network response was not ok')

    // Optionally refresh or mutate data here
  }
  catch (error) {
    console.error('Failed to update OSM ID:', error)
  }
}
