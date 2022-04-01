const code = `
const LandingHtml = \`
<head>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Village Landing Page</title>
    <link rel="stylesheet" href="https://unpkg.com/bulma@0.9.3/css/bulma.min.css">
</head>

<body>
<div id="placeholder" style='background-color: #0a0a0a; height: 100%;'></div>
<div id="landing" style='display: none;'>
    <section class="section">

            <h1 class="title">
                Village: An Internet OS.
            </h1>
            <p class="subtitle">
                Change the code, change the world.
            </p>

    </section>

    <section class="hero is-medium is-link">
        <div class="hero-body">
            <section class="container">
                <p class="block is-size-3"> Ready to join peer-to-peer?</p>

                <button id="btn_start" class="button is-primary is-large" >Bring me in!</button>
            </section>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="content">
                <h3>What is Village?</h3>

                <p>Village is a fully decentralized peer-to-peer network living in web browsers.  Once you join the network
                    and connect to your peers, all the content in your web page is served by your peers.  Servers are not
                    used except to facilitate the very first time you connect to the network.
                </p>

                <h3>How is Village built?</h3>

                <p>Village is coded by its users.  When an improvement is proposed, users decide whether they want to use it
                    or reject it.  This makes village continue improving.  Have an idea to improve Village?  Code it up and
                    share it with the Village!
                </p>

                <h3>What tools are required to code Village components?</h3>

                <p>Village can be coded directly in the web browser - no special tools needed.  You can start coding Village
                today with just simple Javascript</p>

                <h3>Where is the Village data stored?</h3>

                <p>Village data is stored in the web browser's cache.  When new data enters the network, it is shared and
                stored amongst peers as backup</p>
            </div>
        </div>
    </section>
</div>
</body>
\`;

class _Landing {
  constructor() {
    document.getElementsByTagName("html")[0].innerHTML = LandingHtml;
    
    const link = document.createElement('link');
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.onload = () => { 
       //prevent white flash
       const placeholder = document.getElementById('placeholder');
       const landing = document.getElementById('landing');
       landing.removeAttribute('style');
       placeholder.remove();
    };
    link.setAttribute("href", 'https://unpkg.com/bulma-prefers-dark@0.1.0-beta.1/css/bulma-prefers-dark.css');
    document.getElementsByTagName("head")[0].appendChild(link);

    this.registerListeners();
  }
  
  start() {
   window.parent.postMessage({closeApp: true, sourceApp: 'LandingApp'},'*');
  }

  registerListeners() {
    document.getElementById('btn_start').addEventListener('click', () => this.start());
  }
}

const Landing = new _Landing();
`;


const LandingApp = {
  name: 'Landing Page',
  code,
}

export default LandingApp;
