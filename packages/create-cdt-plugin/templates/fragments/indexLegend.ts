  ctx.register('viewer.legends', {
    id: '{{SLUG}}',
    title: '{{NAME}}',
    // Explicit on purpose: the field is optional, and omitting it means every viewer.
    viewers: {{VIEWERS}},
    useLegend,
  })
