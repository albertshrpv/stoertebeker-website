import { type DevToolbarApp } from "astro";
import { closeOnOutsideClick } from "./utils";

const appName = "Operationen";


const buildRequestedMessage = "Build wird gestartet. Bitte warten...";
const isBuildingMessage = "Build läuft. Das kann einige Minuten dauern. Bitte warten...";
const buildFinishedMessage = "Build abgeschlossen. Deine Website ist jetzt live.";
const buildFailedMessage = "Build fehlgeschlagen. Bitte versuche es erneut.";

export default {
  // id: "astro-build",
  // name: appName,
  // icon: '<svg height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-82q-76-8-141.5-41.5t-114-87Q136-264 108-333T80-480q0-91 36.5-168T216-780h-96v-80h240v240h-80v-109q-55 44-87.5 108.5T160-480q0 123 80.5 212.5T440-163v81Zm-17-214L254-466l56-56 113 113 227-227 56 57-283 283Zm177 196v-240h80v109q55-45 87.5-109T800-480q0-123-80.5-212.5T520-797v-81q152 15 256 128t104 270q0 91-36.5 168T744-180h96v80H600Z"/></svg>',
  init(canvas, eventTarget) {
    const windowElement = document.createElement("astro-dev-toolbar-window");

    const style = document.createElement("style");
    style.textContent = `
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    
      h1 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: rgb(255, 255, 255);
        margin: 0px;
        font-size: 22px;
      }

      h3 {
        font-size: 16px;
        font-weight: 400;
        color: white;
        margin: 0px 0px 4px;
      }

      label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        line-height: 1.5rem;
      }

      section {
        margin-right: 16px;
      }

      p {
        margin: 0px;
      }

      a, a:visited {
        color: rgb(9, 105, 218);
      }
    `;
    windowElement.appendChild(style);

    const header = document.createElement("header");
    const title = document.createElement("h1");
    title.textContent = appName;
    header.appendChild(title);

    const section = document.createElement("section");
    const field = document.createElement("label");
    const fieldTitle = document.createElement("h3");
    fieldTitle.textContent = "Änderungen veröffentlichen";
    const fieldDescription = document.createElement("p");
    fieldDescription.textContent = "Starte einen Build und veröffentliche die Änderungen an deine Website.";
    section.appendChild(fieldTitle);
    section.appendChild(fieldDescription);
    const button = document.createElement("astro-dev-toolbar-button");
    button.textContent = "Veröffentlichen";
    button.buttonStyle = "purple";
    button.size = "medium";

    const section2 = document.createElement("section");
    const field2 = document.createElement("label");
    const fieldTitle2 = document.createElement("h3");
    fieldTitle2.textContent = "Dev-Server neustarten";
    const fieldDescription2 = document.createElement("p");
    fieldDescription2.textContent = "Wenn eine neue Seite angelegt wurde, starte den Dev-Server neu, um diese sehen zu können. Nachdem der Button geklickt wurde, warte einige Sekunde und aktualisiere die Seite.";
    section2.appendChild(fieldTitle2);
    section2.appendChild(fieldDescription2);
    const button2 = document.createElement("astro-dev-toolbar-button");
    button2.textContent = "Neustarten";
    button2.buttonStyle = "purple";
    button2.size = "medium";


    button.addEventListener("click", (e) => {
      if (button.ariaDisabled == "true") return;
      import.meta.hot?.send("astro-build:clicked", {
        // Optional: data to send to the server
        // build: true,
      });
      fieldDescription.textContent = buildRequestedMessage;
    });
    import.meta.hot?.on("astro-build:build-status", (data) => {
      // Got the tunnel URL from the server
      if (data.status == "running") {
        fieldDescription.textContent = isBuildingMessage;
        button.ariaDisabled = "true";
        button.textContent = "Build läuft...";
      } else if (data.status == "error") {
        fieldDescription.textContent = buildFailedMessage;
        button.ariaDisabled = "false";
        button.textContent = "Veröffentlichen";
      } else if (data.status == "finished") {
        fieldDescription.textContent = buildFinishedMessage;
        button.ariaDisabled = "false";
        button.textContent = "Veröffentlichen";
      }
    });

    button2.addEventListener("click", (e) => {
      if (button.ariaDisabled == "true") return;
      import.meta.hot?.send("astro-restart-dev-server:clicked", {
      });
      fieldDescription2.textContent = "Dev-Server wird neugestartet. Bitte warte einige Sekunden und aktualisiere die Seite.";
    });
    import.meta.hot?.on("astro-restart-dev-server:status", (data) => {
      // Got the tunnel URL from the server
      if (data.status == "running") {
        fieldDescription2.textContent = "Neustart wurde initiiert. Das kann einige Sekunden dauern. Bitte warten...";
        button2.ariaDisabled = "true";
        button2.textContent = "Neustart läuft...";
      } else if (data.status == "error") {
        fieldDescription2.textContent = "Neustart fehlgeschlagen. Bitte versuche es erneut.";
        button2.ariaDisabled = "false";
        button2.textContent = "Neustarten";
      } else if (data.status == "finished") {
        fieldDescription2.textContent = "Neustart abgeschlossen. Bitte aktualisiere die Seite.";
        button2.ariaDisabled = "true";
        button2.textContent = "Neustart abgeschlossen";
      }
    });

    header.appendChild(button);
    windowElement.appendChild(header);

    const hr = document.createElement("hr");
    const hr2 = document.createElement("hr");
    windowElement.appendChild(hr);
    field.appendChild(section);
    field.appendChild(button);
    windowElement.appendChild(field);
    windowElement.appendChild(hr2);
    field2.appendChild(section2);
    field2.appendChild(button2);
    windowElement.appendChild(field2);

    canvas.appendChild(windowElement);

    closeOnOutsideClick(eventTarget);
  },
} satisfies DevToolbarApp;
