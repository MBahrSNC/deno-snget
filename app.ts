import { config } from 'https://deno.land/x/dotenv/mod.ts';

config({ export: true });

// Function to make the POST request
async function sendPostRequest(username: string, password: string, data: any) {
  try {
    const response = await fetch(`https://${Deno.env.get('TARGET_ENV')}.service-now.com/api/now/table/sys_trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
      },
      body: JSON.stringify(data),
    });

    console.log(response.status + ' ' + 'Request successfully sent');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Function to prompt for username, password, and data
async function promptForData() {
  const table = await prompt('Enter table: ');
  const query = await prompt('Enter query: ');

  const newQuery = encodeURIComponent(query);
  const encodedQuery = newQuery.replace(/'/g, '\\\'');

  const data = {
    name: 'Temp Export / Import Job',
    query: encodedQuery,
    script: `var request = new sn_ws.RESTMessageV2();
    request.setEndpoint('https://${Deno.env.get('SOURCE_ENV')}.service-now.com/api/now/table/${table}?sysparm_exclude_reference_link=true&sysparm_query=${encodedQuery}');
    request.setHttpMethod('GET');
    var user = "${Deno.env.get('SOURCE_USERNAME')}";
    var password = "${Deno.env.get('SOURCE_PASSWORD')}";
    request.setBasicAuth(user, password);
    request.setRequestHeader('Accept', 'application/json');
    var response = request.execute();
    var rec = JSON.parse(response.getBody());
    var results = rec['result'];
    for(var i = 0; i < results.length; i++) {
      var newRec = new GlideRecord('${table}');
      if (!newRec.get(results[i].sys_id.toString())) {
        newRec.sys_id = results[i].sys_id.toString();
      } else {
        gs.info(results[i].sys_id.toString());
        newRec.get(results[i].sys_id.toString());
      }
      for (key in results[i]) {
        newRec[key] = results[i][key].toString();
      }
      newRec.setWorkflow(false);
      newRec.autoSysFields(false);
      newRec.update();
    }`,
    trigger_type: 0,
    next_action: '2000-07-12 12:34:02',
  };

  await sendPostRequest(Deno.env.get('TARGET_USERNAME')!, Deno.env.get('TARGET_PASSWORD')!, data);
}

// Function to read input from the user
async function prompt(question: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(question));
  const n = await Deno.stdin.read(buf);
  if (n === null) {
    throw new Error('Error reading user input.');
  }
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

// Call the prompt function to start the process
await promptForData();
