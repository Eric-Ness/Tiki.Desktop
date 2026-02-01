/**
 * File Icons Utility
 *
 * Returns appropriate icons for different file types.
 * Uses Lucide icons to match the rest of the app.
 */

import {
  File,
  FileCode,
  FileText,
  FileType,
  Image,
  Folder,
  FolderOpen,
  Settings,
  Database,
  FileSpreadsheet,
  Braces,
  Terminal,
  Palette,
  Lock,
  FileArchive,
  Video,
  Music,
  Globe
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FileIconConfig {
  icon: LucideIcon
  color: string
}

/**
 * Icon configuration by file extension.
 */
const extensionIcons: Record<string, FileIconConfig> = {
  // TypeScript/JavaScript
  ts: { icon: FileCode, color: 'text-blue-400' },
  tsx: { icon: FileCode, color: 'text-blue-400' },
  js: { icon: FileCode, color: 'text-yellow-400' },
  jsx: { icon: FileCode, color: 'text-yellow-400' },
  mjs: { icon: FileCode, color: 'text-yellow-400' },
  cjs: { icon: FileCode, color: 'text-yellow-400' },

  // Web
  html: { icon: Globe, color: 'text-orange-400' },
  htm: { icon: Globe, color: 'text-orange-400' },
  css: { icon: Palette, color: 'text-blue-300' },
  scss: { icon: Palette, color: 'text-pink-400' },
  sass: { icon: Palette, color: 'text-pink-400' },
  less: { icon: Palette, color: 'text-blue-300' },

  // Data formats
  json: { icon: Braces, color: 'text-yellow-300' },
  yaml: { icon: FileText, color: 'text-red-300' },
  yml: { icon: FileText, color: 'text-red-300' },
  xml: { icon: FileCode, color: 'text-orange-300' },
  toml: { icon: FileText, color: 'text-gray-400' },

  // Markdown/Text
  md: { icon: FileText, color: 'text-blue-200' },
  mdx: { icon: FileText, color: 'text-blue-200' },
  txt: { icon: FileText, color: 'text-gray-400' },
  rtf: { icon: FileText, color: 'text-gray-400' },

  // Config files
  env: { icon: Lock, color: 'text-yellow-500' },
  gitignore: { icon: Settings, color: 'text-gray-500' },
  eslintrc: { icon: Settings, color: 'text-purple-400' },
  prettierrc: { icon: Settings, color: 'text-purple-400' },
  editorconfig: { icon: Settings, color: 'text-gray-400' },

  // Shell/Scripts
  sh: { icon: Terminal, color: 'text-green-400' },
  bash: { icon: Terminal, color: 'text-green-400' },
  zsh: { icon: Terminal, color: 'text-green-400' },
  ps1: { icon: Terminal, color: 'text-blue-400' },
  bat: { icon: Terminal, color: 'text-gray-400' },
  cmd: { icon: Terminal, color: 'text-gray-400' },

  // Programming languages
  py: { icon: FileCode, color: 'text-yellow-300' },
  rb: { icon: FileCode, color: 'text-red-400' },
  go: { icon: FileCode, color: 'text-cyan-400' },
  rs: { icon: FileCode, color: 'text-orange-400' },
  java: { icon: FileCode, color: 'text-red-400' },
  kt: { icon: FileCode, color: 'text-purple-400' },
  swift: { icon: FileCode, color: 'text-orange-400' },
  c: { icon: FileCode, color: 'text-blue-300' },
  cpp: { icon: FileCode, color: 'text-blue-400' },
  h: { icon: FileCode, color: 'text-purple-300' },
  cs: { icon: FileCode, color: 'text-green-400' },
  php: { icon: FileCode, color: 'text-purple-400' },

  // Database
  sql: { icon: Database, color: 'text-blue-300' },
  db: { icon: Database, color: 'text-gray-400' },
  sqlite: { icon: Database, color: 'text-blue-300' },

  // Images
  png: { icon: Image, color: 'text-purple-300' },
  jpg: { icon: Image, color: 'text-purple-300' },
  jpeg: { icon: Image, color: 'text-purple-300' },
  gif: { icon: Image, color: 'text-purple-300' },
  svg: { icon: Image, color: 'text-orange-300' },
  ico: { icon: Image, color: 'text-purple-300' },
  webp: { icon: Image, color: 'text-purple-300' },

  // Media
  mp4: { icon: Video, color: 'text-pink-400' },
  webm: { icon: Video, color: 'text-pink-400' },
  mov: { icon: Video, color: 'text-pink-400' },
  mp3: { icon: Music, color: 'text-green-300' },
  wav: { icon: Music, color: 'text-green-300' },
  ogg: { icon: Music, color: 'text-green-300' },

  // Archives
  zip: { icon: FileArchive, color: 'text-yellow-400' },
  tar: { icon: FileArchive, color: 'text-yellow-400' },
  gz: { icon: FileArchive, color: 'text-yellow-400' },
  rar: { icon: FileArchive, color: 'text-yellow-400' },

  // Documents
  pdf: { icon: FileType, color: 'text-red-400' },
  doc: { icon: FileText, color: 'text-blue-400' },
  docx: { icon: FileText, color: 'text-blue-400' },
  xls: { icon: FileSpreadsheet, color: 'text-green-400' },
  xlsx: { icon: FileSpreadsheet, color: 'text-green-400' },
  csv: { icon: FileSpreadsheet, color: 'text-green-300' },

  // Lock files
  lock: { icon: Lock, color: 'text-gray-500' }
}

/**
 * Special file names that get specific icons.
 */
const specialFiles: Record<string, FileIconConfig> = {
  'package.json': { icon: Braces, color: 'text-green-400' },
  'package-lock.json': { icon: Lock, color: 'text-gray-500' },
  'tsconfig.json': { icon: Settings, color: 'text-blue-400' },
  'vite.config.ts': { icon: Settings, color: 'text-purple-400' },
  'vite.config.js': { icon: Settings, color: 'text-purple-400' },
  'tailwind.config.js': { icon: Palette, color: 'text-cyan-400' },
  'tailwind.config.ts': { icon: Palette, color: 'text-cyan-400' },
  '.gitignore': { icon: Settings, color: 'text-gray-500' },
  '.env': { icon: Lock, color: 'text-yellow-500' },
  '.env.local': { icon: Lock, color: 'text-yellow-500' },
  '.env.development': { icon: Lock, color: 'text-yellow-500' },
  '.env.production': { icon: Lock, color: 'text-yellow-500' },
  Dockerfile: { icon: FileCode, color: 'text-blue-400' },
  'docker-compose.yml': { icon: FileCode, color: 'text-blue-400' },
  'README.md': { icon: FileText, color: 'text-blue-200' },
  'CHANGELOG.md': { icon: FileText, color: 'text-green-300' },
  LICENSE: { icon: FileText, color: 'text-yellow-300' },
  'CLAUDE.md': { icon: FileText, color: 'text-amber-400' }
}

/**
 * Get the icon component and color for a file.
 */
export function getFileIconConfig(fileName: string): FileIconConfig {
  // Check special files first
  const lowerName = fileName.toLowerCase()
  if (specialFiles[fileName] || specialFiles[lowerName]) {
    return specialFiles[fileName] || specialFiles[lowerName]
  }

  // Get extension
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && extensionIcons[ext]) {
    return extensionIcons[ext]
  }

  // Default
  return { icon: File, color: 'text-gray-400' }
}

/**
 * Render a file icon as a React element.
 */
export function FileIcon({
  fileName,
  className = 'w-4 h-4'
}: {
  fileName: string
  className?: string
}): JSX.Element {
  const { icon: IconComponent, color } = getFileIconConfig(fileName)
  return <IconComponent className={`${className} ${color}`} />
}

/**
 * Render a folder icon.
 */
export function FolderIcon({
  isOpen = false,
  className = 'w-4 h-4'
}: {
  isOpen?: boolean
  className?: string
}): JSX.Element {
  const IconComponent = isOpen ? FolderOpen : Folder
  return <IconComponent className={`${className} text-amber-400`} />
}
