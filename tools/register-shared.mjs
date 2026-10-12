import { registerHooks } from 'node:module'
registerHooks({
  resolve(specifier, context, next) {
    if (
      context.parentURL?.includes('/shared/') &&
      specifier.startsWith('./') &&
      !specifier.endsWith('.ts')
    )
      specifier += '.ts'
    return next(specifier, context)
  },
})
