export type Redaction = {
  id: string
  type: string
  value: string
  page: number
  approved: boolean
}

export const MOCK_REDACTIONS: Redaction[] = [
  { id: "1", type: "Name",    value: "John Smith",            page: 1, approved: true },
  { id: "2", type: "Email",   value: "john@example.com",      page: 1, approved: true },
  { id: "3", type: "Phone",   value: "(555) 123-4567",        page: 1, approved: true },
  { id: "4", type: "SSN",     value: "123-45-6789",           page: 2, approved: true },
  { id: "5", type: "Name",    value: "Jane Doe",              page: 2, approved: true },
  { id: "6", type: "Address", value: "742 Evergreen Terrace", page: 2, approved: true },
]
