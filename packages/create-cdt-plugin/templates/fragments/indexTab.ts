  ctx.register('viewer.tabs', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    labelKey: '{{NAME}}',
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    // Explicit on purpose: the field is optional, and omitting it means every viewer.
    viewers: {{VIEWERS}},
  })
