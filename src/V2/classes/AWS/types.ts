export type FileType =
    | 'text/plain'
    | 'text/html'
    | 'text/css'
    | 'application/javascript'
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp'
    | 'image/svg+xml'
    | 'audio/mpeg'
    | 'audio/wav'
    | 'audio/ogg'
    | 'video/mp4'
    | 'video/ogg'
    | 'video/webm'
    | 'video/avi' // Added video/avi
    | 'application/json'
    | 'application/pdf'
    | 'application/zip'
    | 'application/vnd.ms-excel'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/octet-stream';

export type ThrowPolicy = 'TOF' | 'WOF'; // Throw on fail | Warn on fail
