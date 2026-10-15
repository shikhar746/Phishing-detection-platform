import { validateEmailContent, validateUrl } from '@phishlens/core'
import { z } from 'zod'

/** A zod string checked by one of core's validators (null = valid), so the API and the web form agree exactly. */
const checkedBy = (validate: (value: string) => string | null) =>
  z.string({ message: 'Required' }).superRefine((value, ctx) => {
    const problem = validate(value)
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  })

export const urlScanSchema = z.object({ url: checkedBy(validateUrl) })
export const emailScanSchema = z.object({ content: checkedBy(validateEmailContent) })
