// Page collections use Decap's existing file editor and GitHub writes.
export function pageCollections(field) {
  const text = (name, label, extra = {}) => field(name, label, 'text', { required: false, ...extra });
  const image = (name, label, required = false) => field(name, label, 'image', { required });
  const rich = (name, label) => field(name, label, 'markdown', { required: false,
    buttons: ['bold', 'italic', 'link', 'bulleted-list', 'numbered-list'], editor_components: [] });
  const list = (name, label, summary, fields) => field(name, label, 'list', {
    summary, fields, collapsed: true, required: false, allow_reorder: true, add_to_top: true,
    hint: 'New items appear first. Drag handles to change the order.'
  });
  const page = (name, label, fields) => ({ name, label, format: 'json', delete: false,
    editor: { preview: false }, files: [{ name: 'page', label: `${label} content`, file: `content/${name}.json`, fields }] });
  return [
    page('home', 'Home', [
      field('title', 'Main heading'), text('affiliation', 'School and university', { hint: 'One line per affiliation.' }),
      text('intro', 'English introduction'), text('intro_ko', 'Korean introduction'),
      image('background', 'Hero background image', true), field('background_alt', 'Background image description', 'string', { required: false }),
      field('research_label', 'Research areas heading'),
      list('areas', 'Research area cards', '{{fields.title}}', [field('title', 'Title'), text('body', 'Description')])
    ]),
    page('research', 'Research', [
      field('eyebrow', 'Section label', 'string', { required: false }), field('title', 'Page title'), text('intro', 'Page introduction'),
      list('sections', 'Research groups', '{{fields.editor_title}}', [
        field('editor_title', 'Editor title', 'string', { hint: 'Only used to identify this group in the editor.' }),
        text('title', 'Visible group heading (optional)'),
        list('items', 'Research items', '{{fields.editor_title}}', [
          field('editor_title', 'Editor title', 'string', { hint: 'Only used to identify this card in the editor.' }),
          field('layout', 'Card layout', 'select', { default: 'research', options: [
            { label: 'Introduction card', value: 'feature' }, { label: 'Research item', value: 'research' }
          ] }),
          field('title', 'Visible heading (optional)', 'string', { required: false, hint: 'Include any numbering you want to display.' }),
          rich('body', 'Full description'), image('image', 'Image (optional)'),
          field('image_alt', 'Image description', 'string', { required: false }),
          field('video_url', 'YouTube video URL (optional)', 'string', { required: false,
            hint: 'Paste a YouTube watch, share or embed URL. Choose an image or a video for each card.' }),
          field('video_title', 'Video description', 'string', { required: false })
        ])
      ])
    ]),
    page('contact', 'Contact', [
      field('eyebrow', 'Section label', 'string', { required: false }), field('title', 'Page title'),
      list('offices', 'Offices and addresses', '{{fields.title}}', [field('title', 'Office heading'),
        text('english', 'English address', { hint: 'One address line per line.' }),
        text('korean', 'Korean address', { hint: 'One address line per line.' })]),
      field('map_query', 'Map location', 'string', { hint: 'For example: Korea University Innovation Building' }),
      field('map_zoom', 'Map zoom', 'number', { value_type: 'int', min: 1, max: 20, default: 16 }),
      field('map_title', 'Map description')
    ])
  ];
}
