const PageHtml = `
<head>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Hello World Page</title>
    <style>
      <!-- prevent white flash -->
      body { background-color: #0a0a0a; height: 100%; }
    </style>
    <link rel="stylesheet" href="https://unpkg.com/bulma@0.9.4/css/bulma.min.css">
    <link rel="stylesheet" href="https://unpkg.com/bulmaswatch/solar/bulmaswatch.min.css">
</head>

<body>
<div id="placeholder" style='background-color: #0a0a0a; height: 100%;'></div>
<div>
    <section class="section">
        <h1 class="title">
           Hello World
        </h1>
        <p class="subtitle">
            Change the code, change the world.
        </p>
    </section>

    <section class="hero is-medium is-link">
        <div class="hero-body">
            <section class="container">
                <p class="block is-size-3"> See below how to programmatically close the app:</p>

                <button id="btn_close" class="button is-primary is-large" >Close App</button>
            </section>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="content">
                <h3>Here is my content!</h3>
            </div>
        </div>
    </section>
</div>
</body>
`;

class _Page {
  constructor() {
    document.getElementsByTagName("html")[0].innerHTML = PageHtml;

    this.registerListeners();
  }

  closeApp() {
    window.parent.postMessage({type: 'closeApp', payload: {}},'*');
  }

  registerListeners() {
    document.getElementById('btn_close').addEventListener('click', () => this.closeApp());
  }
}

new _Page();
