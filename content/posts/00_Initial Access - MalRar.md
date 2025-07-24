---
title: "MalRar - Compressing Initial Access"
date: 2023-03-09T16:20:29+05:30
draft: false
github_link: "https://github.com/gurusabarish/hugo-profile"
author: "Durok"
tags:
  - Initial Access
  - Execution
  - Red Teaming
image: /images/posts/malrar/00-malrar.webp
description: ""
toc: 
---


## Embedding a Malicious Executable into a Regular PDF or EXE
🛠️ Let's assume we have already created our malicious executable, which will perform certain actions on the victim's host or send us a reverse shell. 

The following steps describe the process of creating our file to make it look legitimate:

### 1️⃣ Create .ico file 

Find a PNG icon that represents how your malicious executable should appear, using **_[Iconfinder.com](https://iconfinder.com/)_**.

In this example, we use the Firefox logo, but you can find logos for any file type.

Click "Download PNG."

![Firefox Icon](/images/posts/malrar/05-flaticon-png.png)


Now Convert the PNG icon to a .ico file using **_[icoconverter.com](https://icoconverter.com/)_**.

Upload the previously downloaded PNG file and click "Convert".

![Iconconverter](/images/posts/malrar/05-Converter.png)

---

### 2️⃣ Create a combined archive

On the desktop, select the actual Firefox browser executable and your malicious executable (in our case we are using `calc.exe`), right-click them, and choose **`"Add to Archive..."`** to create a combined archive.

![Archive-1](/images/posts/malrar/00-setting.png)

🔹 Name the archive file simply as Firefox.exe to give it a legitimate appearance. 

🔹 Ensure the "Create SFX archive" checkbox is checked.

> ℹ️ Information
>
> You can use the `RAR` format too, but `ZIP` avoids flashing a window open, so I chose the `ZIP` archive format.
---

### 3️⃣ Configure the SFX archive

Click `"Advanced"` > `"SFX options"` > `"Setup"` and enter the following:

![Archive-2](/images/posts/malrar/01-advanced.png)

🔹 In the `"Run after extraction"` field, input `calc.exe` (your malicious exe file) and the legitimate `Firefox.exe` (the program that will open after the malicious exe runs).

![Archive-3](/images/posts/malrar/02-advanced-setup.png)
![Archive-4](/images/posts/malrar/03-advanced-modes.png)
![Archive-5](/images/posts/malrar/04-advanced-update.png)
![Archive-6](/images/posts/malrar/06-advanced-icon.png)

---
### 4️⃣ Finalizing the Archive

After entering the above parameters, click "OK", and an archive named Firefox.exe will appear on the desktop with the correct Firefox icon. 

![Archive-7](/images/posts/malrar/07-final-zip.png)

Double-clicking on Firefox.exe will execute our malicious executable and also open a browser tab as usual. 

To bypass Defender when launching our exe alongside another harmless exe, nothing more is required.

✅ The job is done.

---

## 🔥 Right-To-Left Override (RTLO) for Other File Types (e.g., PDF)

We will use the **Right-To-Left Override (`RTLO`)** character to modify the created archive so that it appears as a PDF on the desktop but executes as an EXE.

RTLO is an invisible Unicode character used for writing languages read from right to left. It takes input and literally flips the text backward.

We will rename the file to something that will look almost normal when flipped, such as Reflexe.pdf. 

We will insert our Unicode (`U+202E`) so that on the victim's desktop, it appears as `Refl[hidden Unicode]exe.pdf` but is actually `Refl[hidden Unicode]fdp.exe`.

> 💡 Tip
>
> To further extend this, also look for the Left-to-Right character (U+202D) that might be used to further obfuscate the true filename.

Open the "`Character Map`" application in Windows and check the "`Advanced View`" box
In the "Go to Unicode" field, enter 202E.
Click "Select" and "Copy", then edit the name of the WinRAR archive we created.

![Archive-8](/images/posts/malrar/08-charmap.png)

Enter a new pdf incon and the file name as Refl[CTRL+V]fdp.exe, then go back and paste the Unicode in the specified place.

![Archive-9](/images/posts/malrar/06-advanced-icon.png)

![Archive-10](/images/posts/malrar/10-archive-name.png)

The file should change to Reflexe.pdf once you press paste. 

![Archive-11](/images/posts/malrar/11-archive-name-after.png)

![Archive-12](/images/posts/malrar/12-final-file.png)

⚠️ However, since this is a known file type (.pdf) that initiates the execution of an executable file, Windows Defender will quickly flag it as malicious.

Try Bypassing Windows Defender Using Homoglyphs

After all, we want the file to look like a PDF to the user, so is it likely they will notice that one letter looks slightly different? 

This resource is usefull for manual testing of what Defender might flag: 
- IronGeek Homoglyph Generator -> https://www.irongeek.com/homoglyph-attack-generator.php

> ⚠️ Disclaimer
>
> This guide is for educational and research purposes only! 🛑
