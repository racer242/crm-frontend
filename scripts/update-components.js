const fs = require('fs');
const d = JSON.parse(fs.readFileSync('config/crm-config.json', 'utf8'));

const idx = d.pages.findIndex(p => p.id === 'components');
if (idx > -1) d.pages.splice(idx, 1);

d.pages.push({
  id: 'components',
  type: 'page',
  route: '/components',
  state: { loading: false },
  meta: { title: 'Components Showcase' },
  sections: [
    { id: 'header', type: 'section', state: {}, blocks: [{
      id: 'title', type: 'block', blockType: 'header', state: {},
      components: [{ id: 't', type: 'component', componentType: 'Text', props: { value: 'All 37 Components', level: 1 }, state: {} }]
    }]},
    { id: 'textBadges', type: 'section', state: {}, layout: { type: 'grid', columns: 3 }, blocks: [
      { id: 'textB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Text' } }, components: [
        { id: 'h1', type: 'component', componentType: 'Text', props: { value: 'Heading 1', level: 1 }, state: {} },
        { id: 'p', type: 'component', componentType: 'Text', props: { value: 'Regular text' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'badgeB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Badge' } }, components: [
        { id: 'b1', type: 'component', componentType: 'Badge', props: { value: '5', severity: 'info' }, state: {} },
        { id: 'b2', type: 'component', componentType: 'Badge', props: { value: 'OK', severity: 'success' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'tagB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Tag' } }, components: [
        { id: 't1', type: 'component', componentType: 'Tag', props: { value: 'Primary', severity: 'primary' }, state: {} },
        { id: 't2', type: 'component', componentType: 'Tag', props: { value: 'Warn', severity: 'warning' }, state: {} }
      ], className: 'col-12 md:col-4' }
    ]},
    { id: 'inputs', type: 'section', state: {}, layout: { type: 'grid', columns: 3 }, blocks: [
      { id: 'inputTextB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'InputText' } }, components: [
        { id: 'it1', type: 'component', componentType: 'InputText', props: { placeholder: 'Default' }, state: {} },
        { id: 'it2', type: 'component', componentType: 'InputText', props: { placeholder: 'Filled' }, state: { value: 'Text here' } },
        { id: 'it3', type: 'component', componentType: 'InputText', props: { placeholder: 'Disabled', disabled: true }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'inputNumB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'InputNumber' } }, components: [
        { id: 'in1', type: 'component', componentType: 'InputNumber', props: { placeholder: 'Number' }, state: {} },
        { id: 'in2', type: 'component', componentType: 'InputNumber', props: { mode: 'currency', currency: 'USD' }, state: { value: 100 } }
      ], className: 'col-12 md:col-4' },
      { id: 'textareaB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'InputTextarea' } }, components: [
        { id: 'ta1', type: 'component', componentType: 'InputTextarea', props: { placeholder: 'Type...', rows: 3 }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'pwdB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Password' } }, components: [
        { id: 'pw1', type: 'component', componentType: 'Password', props: { placeholder: 'Password' }, state: {} },
        { id: 'pw2', type: 'component', componentType: 'Password', props: { placeholder: 'Toggle', toggleMask: true }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'dropB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Dropdown' } }, components: [
        { id: 'd1', type: 'component', componentType: 'Dropdown', props: { options: [{ label: 'Apple', value: 'a' }, { label: 'Banana', value: 'b' }], placeholder: 'Select' }, state: {} },
        { id: 'd2', type: 'component', componentType: 'Dropdown', props: { options: [{ label: 'Red', value: 'r' }, { label: 'Green', value: 'g' }] }, state: { value: 'g' } }
      ], className: 'col-12 md:col-4' },
      { id: 'multiB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'MultiSelect' } }, components: [
        { id: 'ms1', type: 'component', componentType: 'MultiSelect', props: { options: [{ label: 'JS', value: 'js' }, { label: 'TS', value: 'ts' }, { label: 'Py', value: 'py' }], placeholder: 'Select' }, state: {} },
        { id: 'ms2', type: 'component', componentType: 'MultiSelect', props: { options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] }, state: { value: ['a'] } }
      ], className: 'col-12 md:col-4' },
      { id: 'autoB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'AutoComplete' } }, components: [
        { id: 'ac1', type: 'component', componentType: 'AutoComplete', props: { suggestions: ['Apple', 'Banana', 'Cherry'], placeholder: 'Search' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'calB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Calendar' } }, components: [
        { id: 'c1', type: 'component', componentType: 'Calendar', props: { placeholder: 'Date' }, state: {} },
        { id: 'c2', type: 'component', componentType: 'Calendar', props: { inline: true }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'checkB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Checkbox' } }, components: [
        { id: 'ch1', type: 'component', componentType: 'Checkbox', props: { label: 'Accept terms' }, state: { value: false } },
        { id: 'ch2', type: 'component', componentType: 'Checkbox', props: { options: [{ label: 'Email', value: 'e' }, { label: 'SMS', value: 's' }] }, state: { value: ['e'] } }
      ], className: 'col-12 md:col-4' },
      { id: 'radioB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'RadioButton' } }, components: [
        { id: 'r1', type: 'component', componentType: 'RadioButton', props: { options: [{ label: 'S', value: 's' }, { label: 'M', value: 'm' }, { label: 'L', value: 'l' }], name: 'size' }, state: { value: 'm' } }
      ], className: 'col-12 md:col-4' },
      { id: 'switchB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'InputSwitch' } }, components: [
        { id: 'sw1', type: 'component', componentType: 'InputSwitch', props: { label: 'Dark Mode' }, state: { value: true } },
        { id: 'sw2', type: 'component', componentType: 'InputSwitch', props: { label: 'Notify' }, state: { value: false } }
      ], className: 'col-12 md:col-4' },
      { id: 'sliderB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Slider' } }, components: [
        { id: 'sl1', type: 'component', componentType: 'Slider', props: {}, state: { value: 50 } },
        { id: 'sl2', type: 'component', componentType: 'Slider', props: { range: true }, state: { value: [20, 80] } }
      ], className: 'col-12 md:col-4' },
      { id: 'ratingB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'Rating' } }, components: [
        { id: 'ra1', type: 'component', componentType: 'Rating', props: {}, state: { value: 3 } },
        { id: 'ra2', type: 'component', componentType: 'Rating', props: { cancel: false }, state: { value: 5 } }
      ], className: 'col-12 md:col-4' },
      { id: 'colorB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'ColorPicker' } }, components: [
        { id: 'cl1', type: 'component', componentType: 'ColorPicker', props: {}, state: { value: '#42A5F5' } },
        { id: 'cl2', type: 'component', componentType: 'ColorPicker', props: { inline: true }, state: { value: '#66BB6A' } }
      ], className: 'col-12 md:col-4' },
      { id: 'fileB', type: 'block', blockType: 'form', state: {}, wrapper: { component: 'Card', props: { header: 'FileUpload' } }, components: [
        { id: 'f1', type: 'component', componentType: 'FileUpload', props: { mode: 'basic', chooseLabel: 'Select' }, state: {} },
        { id: 'f2', type: 'component', componentType: 'FileUpload', props: { mode: 'advanced', multiple: true }, state: {} }
      ], className: 'col-12 md:col-4' }
    ]},
    { id: 'btnsAvatars', type: 'section', state: {}, layout: { type: 'grid', columns: 3 }, blocks: [
      { id: 'btnB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Button' } }, components: [
        { id: 'bt1', type: 'component', componentType: 'Button', props: { label: 'Primary', severity: 'primary' }, state: {} },
        { id: 'bt2', type: 'component', componentType: 'Button', props: { label: 'Success', severity: 'success' }, state: {} },
        { id: 'bt3', type: 'component', componentType: 'Button', props: { label: 'Danger', severity: 'danger' }, state: {} },
        { id: 'bt4', type: 'component', componentType: 'Button', props: { icon: 'pi pi-check', label: 'Icon' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'avatarB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Avatar' } }, components: [
        { id: 'av1', type: 'component', componentType: 'Avatar', props: { icon: 'pi pi-user', size: 'large' }, state: {} },
        { id: 'av2', type: 'component', componentType: 'Avatar', props: { label: 'AU', shape: 'circle', style: { backgroundColor: '#6366f1' } }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'chipB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Chip' } }, components: [
        { id: 'cp1', type: 'component', componentType: 'Chip', props: { label: 'Chip' }, state: {} },
        { id: 'cp2', type: 'component', componentType: 'Chip', props: { label: 'Icon', icon: 'pi pi-check' }, state: {} }
      ], className: 'col-12 md:col-4' }
    ]},
    { id: 'dataSect', type: 'section', state: {}, layout: { type: 'grid', columns: 2 }, blocks: [
      { id: 'tableB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'DataTable' } }, components: [
        { id: 'dt1', type: 'component', componentType: 'DataTable', props: { columns: [{ field: 'id', header: 'ID' }, { field: 'name', header: 'Name' }], rows: 5 }, state: { value: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] } }
      ], className: 'col-12' },
      { id: 'timeB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Timeline' } }, components: [
        { id: 'tl1', type: 'component', componentType: 'Timeline', props: { events: [{ title: 'Start', description: 'Beginning' }, { title: 'Middle', description: 'Process' }, { title: 'End', description: 'Done' }] }, state: {} }
      ], className: 'col-12' }
    ]},
    { id: 'navSect', type: 'section', state: {}, blocks: [
      { id: 'breadB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Breadcrumb' } }, components: [
        { id: 'br1', type: 'component', componentType: 'Breadcrumb', props: { model: [{ label: 'Home' }, { label: 'Library' }, { label: 'Data' }] }, state: {} }
      ]},
      { id: 'stepsB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Steps' } }, components: [
        { id: 'st1', type: 'component', componentType: 'Steps', props: { model: [{ label: 'Personal' }, { label: 'Payment' }, { label: 'Confirm' }], activeIndex: 1 }, state: {} }
      ]},
      { id: 'menuB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Menubar' } }, components: [
        { id: 'mb1', type: 'component', componentType: 'Menubar', props: { model: [{ label: 'File', icon: 'pi pi-file', items: [{ label: 'New' }, { label: 'Open' }] }, { label: 'Help', icon: 'pi pi-question-circle' }] }, state: {} }
      ]}
    ]},
    { id: 'containerSect', type: 'section', state: {}, layout: { type: 'grid', columns: 2 }, blocks: [
      { id: 'cardB', type: 'block', blockType: 'custom', state: {}, components: [
        { id: 'cd1', type: 'component', componentType: 'Card', props: { header: 'Header', subheader: 'Sub', footer: 'Footer' }, state: {} }
      ], className: 'col-12 md:col-6' },
      { id: 'tabB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'TabView' } }, components: [
        { id: 'tv1', type: 'component', componentType: 'TabView', props: { tabs: [{ header: 'Tab 1', content: 'Content 1' }, { header: 'Tab 2', content: 'Content 2' }] }, state: {} }
      ], className: 'col-12 md:col-6' },
      { id: 'accB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Accordion' } }, components: [
        { id: 'ac1', type: 'component', componentType: 'Accordion', props: { tabs: [{ header: 'Q1', content: 'A1' }, { header: 'Q2', content: 'A2' }] }, state: {} }
      ], className: 'col-12 md:col-6' },
      { id: 'carB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Carousel' } }, components: [
        { id: 'cr1', type: 'component', componentType: 'Carousel', props: { items: [{ title: 'Slide 1', description: 'D1' }, { title: 'Slide 2', description: 'D2' }, { title: 'Slide 3', description: 'D3' }], numVisible: 3, numScroll: 1 }, state: {} }
      ], className: 'col-12 md:col-6' }
    ]},
    { id: 'feedbackSect', type: 'section', state: {}, layout: { type: 'grid', columns: 3 }, blocks: [
      { id: 'msgB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Message' } }, components: [
        { id: 'm1', type: 'component', componentType: 'Message', props: { severity: 'info', text: 'Info' }, state: {} },
        { id: 'm2', type: 'component', componentType: 'Message', props: { severity: 'success', text: 'OK' }, state: {} },
        { id: 'm3', type: 'component', componentType: 'Message', props: { severity: 'warn', text: 'Warn' }, state: {} },
        { id: 'm4', type: 'component', componentType: 'Message', props: { severity: 'error', text: 'Error' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'progB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'ProgressBar' } }, components: [
        { id: 'pb1', type: 'component', componentType: 'ProgressBar', props: { value: 65, showValue: true }, state: {} },
        { id: 'pb2', type: 'component', componentType: 'ProgressBar', props: { mode: 'indeterminate' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'spinB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'ProgressSpinner' } }, components: [
        { id: 'sp1', type: 'component', componentType: 'ProgressSpinner', props: { strokeWidth: '4', fill: 'transparent' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'skelB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Skeleton' } }, components: [
        { id: 'sk1', type: 'component', componentType: 'Skeleton', props: { shape: 'circle', size: '3rem' }, state: {} },
        { id: 'sk2', type: 'component', componentType: 'Skeleton', props: { width: '10rem', height: '2rem' }, state: {} },
        { id: 'sk3', type: 'component', componentType: 'Skeleton', props: { width: '100%', height: '1rem' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'toastB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Toast' } }, components: [
        { id: 'to1', type: 'component', componentType: 'Toast', props: { position: 'bottom-right' }, state: {} }
      ], className: 'col-12 md:col-4' },
      { id: 'divB', type: 'block', blockType: 'custom', state: {}, wrapper: { component: 'Card', props: { header: 'Divider' } }, components: [
        { id: 'dv1', type: 'component', componentType: 'Divider', props: { type: 'solid' }, state: {} },
        { id: 'dv2', type: 'component', componentType: 'Divider', props: { type: 'dashed' }, state: {} }
      ], className: 'col-12 md:col-4' }
    ]}
  ]
});

fs.writeFileSync('config/crm-config.json', JSON.stringify(d, null, 2));
console.log('Components page replaced with all 37 components');
