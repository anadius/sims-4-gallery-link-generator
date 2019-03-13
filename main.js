const BASE_URL = 'https://www.ea.com/games/the-sims/the-sims-4/pc/gallery/';

const TYPES = {
  'households': 1,
  'lots': 2,
  'rooms': 3,
  1: 'Household',
  2: 'Lot',
  3: 'Room'
};

const formatRemoteId = id => {
  const hex = Array.from(id).map(v => v.toString(16).padStart(2, 0));
  return hex.join('').toUpperCase();
};

const readAsUint8Array = file => new Promise(resolve => {
  let reader = new FileReader();
  reader.onload = e => {
    const result = e.target.result;
    const view = new DataView(result);
    const len = view.getUint32(4, true);
    resolve(new Uint8Array(result, 8, len));
  };
  reader.readAsArrayBuffer(file);
});

const isChecked = id => !!document.getElementById(id).checked;

const rootPromise = protobuf.load('bundle.min.json');

$('#traySelector').on('change', async e => {
  const root = await rootPromise;
  const files = e.target.files;
  const allowedTypes = [];
  ['households', 'lots', 'rooms'].forEach(type => {
    if(isChecked(type))
      allowedTypes.push(TYPES[type]);
  });
  const ccOnly = isChecked('ccOnly');

  $('table').hide();
  const table = $('tbody').html('');

  for(const file of files) {
    if(!file.webkitRelativePath.toLowerCase().endsWith('.trayitem'))
      continue;

    // read protocolbuffer message
    const fileContent = await readAsUint8Array(file);
    const message = root.EA.Sims4.Network.TrayMetadata.decode(fileContent);

    // ignore items that are not in gallery
    if(message.remote_id.every(v => v === 0))
      continue;

    // ignore non-CC items if 'CC only' is checked
    const hasCC = message.metadata.is_modded_content;
    if(ccOnly && !hasCC)
      continue;

    // ignore items of type we don't want
    const type = message.type;
    if(allowedTypes.indexOf(type) == -1)
      continue;

    const typeStr = TYPES[type];
    const ccStr = hasCC ? 'Yes' : 'No';
    const name = message.name;
    const url = BASE_URL + formatRemoteId(message.remote_id);

    table.append(`<tr><td>${name}</td><td>${url}</td><td>${typeStr}</td><td>${ccStr}</td></tr>`);
  }
  $('table').show();
});