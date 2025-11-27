import axios from "axios";

// general contact form
const generalContactForm = document.getElementById("generalContactForm")!;
const generalContactFormSuccess = document.getElementById("generalContactFormSuccess")!;
const generalContactFormSubmitButton = document.getElementById("generalContactFormSubmitButton")! as HTMLButtonElement;


if (generalContactForm) {
  generalContactForm.addEventListener("submit", onGeneralContactFormSubmit);
}

function onGeneralContactFormSubmit(event: any) {
  try {
    const url = `https://backend.stoertebeker.de/api/general-contact-forms`;
    generalContactFormSubmitButton.textContent = "Wird gesendet";
    generalContactFormSubmitButton.disabled = true;

    event.preventDefault();
    const data = new FormData(event.target);
    const dataObject = Object.fromEntries(data.entries());
    console.log(dataObject);

    axios({
      method: "post",
      url,
      data: {
        data: dataObject,
      },
    }).then(function (response) {
      console.log(response);
      if (response.status != 200 && response.status != 201) {
        generalContactFormSubmitButton.textContent = "Fehler beim Senden";
        generalContactFormSubmitButton.disabled = false;
        // Handle the error here...
      } else {
        generalContactForm.remove();
        generalContactFormSuccess.style.display = "block";
      }
    });
  } catch (error) {
    console.log(error);
  }
}
