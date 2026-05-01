// TODO: Enforce more striclty type later
type FilterType = {
  id: number // id of the filter
  field: string // field (column name) in the data
  fieldType: 'boolean' | 'string' | 'number' | 'date' | 'enum' // data type of the data column
  operator: // operator to filter that column
    | 'isTrue' | 'isFalse'
    | 'contains' | 'equals' | 'startsWith' | 'endsWith'
    | 'greaterThan' | 'lessThan' | 'between'
    | 'before' | 'after' | 'inList'
  value: boolean | string | number | Date | string[] // value to filter that column
  secondValue: number | Date | null // second value for filtering between
}

function cleanString(value: string) {
  return value.toLowerCase().trim()
}

export function getUniqueColumnValues(data: any[], columnId: string) {
  const uniqueValues = new Set(data.map(row => (row[columnId])))
  return [...uniqueValues]
}

// function that contain all the logic to filter out things
export function filterHelper(data: any[], filters: FilterType[]) {
  let filteredData = data

  for (const filter of filters) {
    const { id, field, fieldType, operator, value, secondValue } = filter
    if (fieldType == null || operator == null || value == null) continue

    filteredData = filteredData.filter((row) => {
      // console.log(row[field])
      switch (fieldType) {
        case 'boolean':
          if (operator == 'isTrue') return row[field] == true
          if (operator == 'isFalse') return row[field] == false
          break

        case 'string':
          if (operator == 'contains') return cleanString(String(row[field])).includes(cleanString(String(value)))
          if (operator == 'startsWith') return cleanString(String(row[field])).startsWith(cleanString(String(value)))
          if (operator == 'endsWith') return cleanString(String(row[field])).endsWith(cleanString(String(value)))
          if (operator == 'equals') return cleanString(String(row[field])) === cleanString(String(value))
          if (operator == 'inList' && Array.isArray(value) && value.length > 0) {
            return value.map(v => cleanString(String(v))).includes(cleanString(String(row[field])))
          }
          break

        case 'enum':
          if (operator == 'equals') return row[field] === value
          if (operator == 'inList' && Array.isArray(value) && value.length > 0) {
            // Handle both single values and arrays in the data
            if (Array.isArray(row[field])) {
              // If the item's field is an array, check if any of its values are in our filter
              return row[field].some(val => value.includes(val))
            }
            else {
              // If the item's field is a single value, check if it's in our filter array
              return value.includes(row[field])
            }
          }
          break

        case 'number':
          if (operator == 'equals') return row[field] == value
          if (operator == 'lessThan') return row[field] < value
          if (operator == 'between' && secondValue != null) return value <= row[field] && row[field] <= secondValue
          if (operator == 'greaterThan') return row[field] > value
          break

        case 'date':
          // Type guard to ensure value is appropriate for Date constructor
          if (typeof value === 'boolean' || Array.isArray(value)) {
            return false // Invalid value type for date operations
          }

          const dateValue = new Date(row[field])
          const filterDateValue = new Date(value)

          if (isNaN(dateValue.getTime()) || isNaN(filterDateValue.getTime())) return false

          if (operator == 'equals') return dateValue.toDateString() === filterDateValue.toDateString()
          if (operator == 'before') return dateValue < filterDateValue
          if (operator == 'after') return dateValue > filterDateValue
          if (operator == 'between' && secondValue != null) {
            // Type guard for secondValue as well
            if (typeof secondValue === 'boolean') {
              return false
            }
            const secondDateValue = new Date(secondValue)
            if (isNaN(secondDateValue.getTime())) return false
            return dateValue >= filterDateValue && dateValue <= secondDateValue
          }
          break

        default:
          return true
      }
      return true // Default case if no operator matches
    })
  }

  return filteredData
}

export const getNarrowedFilterOptions = (
  data: any[],
  baseOptions: any[],
  currentFiltersState: any[],
) => {
  const inListFilters = currentFiltersState.filter(f => f.operator === 'inList')
  // only start narrowing once there are at least two "inList" filters
  if (inListFilters.length <= 1) {
    return baseOptions
  }

  let newBaseOptions = baseOptions
  // use only the inList filters to narrow the data
  for (let i = 1; i < inListFilters.length; i++) {
    const filteredData = filterHelper(data, inListFilters.slice(0, i))
    newBaseOptions = newBaseOptions.map((opt) => {
      if (opt.id != inListFilters[i].field) {
        return opt
      }
      return (
        {
          ...opt,
          valueOptions: getUniqueColumnValues(filteredData, opt.id),
        }
      )
    },
    )
  }
  console.log('new')
  console.log(newBaseOptions)

  return newBaseOptions
}
