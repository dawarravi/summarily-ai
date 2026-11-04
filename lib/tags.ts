export const TAG_SUGGESTIONS = [
    { name: 'Tech', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { name: 'Finance', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'News', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    { name: 'Design', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    { name: 'AI/ML', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
    { name: 'Business', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
    { name: 'Science', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
    { name: 'Personal', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
    { name: 'Entertainment', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { name: 'Health', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
]

const DEFAULT_TAG_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'

export function getTagColor(tagName: string): string {
    return TAG_SUGGESTIONS.find(s => s.name.toLowerCase() === tagName.toLowerCase())?.color ?? DEFAULT_TAG_COLOR
}
