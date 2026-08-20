  ctx.register('{{CAPABILITY}}', {
    id: '{{SLUG}}',
    label: '{{NAME}}',
    // A string, resolved by the platform against its icon set. Naming it rather than
    // importing a component is what keeps `lucide-react` out of this plugin.
    icon: '{{ICON}}',
    component: {{COMPONENT}},
    stayActive: true,
  })
