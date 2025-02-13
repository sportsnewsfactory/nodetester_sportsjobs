export type VictorError = 'ECONNRESET' | 'AggregateError';

export const STATUS = {
    success: 'Great Success!',
    extOrAECrashed: 'ECONNRESET',
    extOrAEClosed: 'AggregateError',
};

export const ERRORS: { [key in VictorError]: string } = {
    ECONNRESET: 'The extension or AE crashed on Render3. Please reopen them.',
    AggregateError:
        'After Effects or the Victor extension are not open on Render3. Please open them.',
};
