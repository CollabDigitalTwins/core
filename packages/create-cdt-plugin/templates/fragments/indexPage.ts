  ctx.register('data.pages', {
    id: '{{SLUG}}',
    // Looked up in this plugin's own message namespace, falling back to the literal.
    titleKey: '{{NAME}}',
    icon: '{{ICON}}',
    useRows,
    columns,
  })
