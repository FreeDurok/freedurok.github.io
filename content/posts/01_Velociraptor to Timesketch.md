---
title: "Velociraptor -> Timesketch: How to build a SuperTimeline"
date: 2025-07-27T08:12:29+01:00
draft: false
github_link: "https://github.com/gurusabarish/hugo-profile"
author: "Durok"
tags:
  - DFIR
  - Timeline
  - Velociraptor
  - Timesketch
image: /images/posts/malrar/00-malrar.webp
description: ""
toc: 
---

# Velociraptor → Timesketch

Questo write-up mostra come costruire delle timeline da alcune macchine da esaminare in Triage a seguito di una compromissione, dall’acquisizione di tutti gli artefatti alla generazione di una Super-Timeline e visualizzarla con Timesketch.

Per la precisione andremo ad effettuare due procedure distinte:

1. Acquisizione manuale con hayabusa
    1. Acquisizione e generazione Timeline con Hayabusa
    2. Import e Visualizzazione su Timesketch
2. Acquisizione automatica con Velociraptor 
    1. Acquisizione con modulo KAPE Files → SANS Triage
    2. Generazione Super-Timeline con plaso (via timesketch worker)
    3. Import e Visualizzazione su Timesketch

Bonus:

- Script per creare un servizio di automazione per la procedura 2.

Il LAB che sto utilizzando per Test è composto da:

- 2 Domain Controller - Windows Server 2025
    - Velociraptor Client
    - Gpo:
        - Disable Defender
        - Enable LanMan Server
        - Enable WinRm
- 1 Workstation - Windows 11 Pro
    - Hayabusa
    - Velociraptor Client
- 1 Kali
    - CobaltStrike
- 1 Ubuntu 24.04 - CPU 1x4 - Ram 8GB - Disk 50GB
    - Velociraptor Server
        - Docker Deploy
    - Timesketch
        - Docker Deploy

Salto lo step delle installazioni delle macchine e la configurazione della kali, ho usato cobaltstrike per seminare degli IOC nell’ambiente ma si può usare qualsiasi cosa.

Non ho configurato gli audit sui DC, poichè il focus è la procedura di costruzione della timeline e la sua automazione lavorando su server singolo.

Intanto iniziamo con la prima prova manuale, ovvero utilizzare hayabusa per generare una Timeline e poi caricarla su TimeSketch.

Per fare questo ci muoviamo sulla macchina Ubuntu e ci apprestiamo ad installare Timesketch tramite Docker.

### Install Docker on Ubuntu

[Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

```bash
#!/bin/bash

# Reference
# https://docs.docker.com/engine/install/ubuntu/

# Remove old packages
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done

# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install latest version
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Test Docker 
sudo docker -v
```

Una volta installato docker passiamo all’installazione di Timesketch:

[Install - timesketch](https://timesketch.org/guides/admin/install/)

```bash
# install-timesketch.sh
curl -s -O https://raw.githubusercontent.com/google/timesketch/master/contrib/deploy_timesketch.sh
chmod 755 deploy_timesketch.sh
cd /opt
sudo ~/deploy_timesketch.sh
cd timesketch
sudo docker compose up -d

# Create a user named user. Set the password here.
sudo docker compose exec timesketch-web tsctl create-user user

```

![image.png](/images/posts/01_timesketch/image.png)

Lo script già ha il comando per creare un’utente e di conseguenza dopo l’esecuzione dei docker verrà richiesta la password da impostare all’utente `user` in questo caso, ma potete usare il nome utente che volete. Per comodità inseriamo `user`::`user`

![image.png](/images/posts/01_timesketch/image1.png)

Qui ho ripetuto l’operazione manualmente, ovviamente il comando qui illustravo va eseguito dalla cartella contiene le variabili dell’ambiente docker, nel mio caso da `/opt/timesketch` , che è il path dove lo script installerà tutto il necessario per avviare il docker-compose.yaml di `timeskecth` 

Ora verifichiamo che tutto sia Up & Running:

![image.png](/images/posts/01_timesketch/image2.png)

Se volete approfondire tutti i vari componenti ti TimeSketch, potete consultare la documentazione sul loro sito ed approfondire il `docker-compose.yaml`.

Uno dei componenti è un server nginx che fa da procy ed espone sulla porta `80` e `443`, non vedremo come configurare il protocollo `https` ma è possibile farlo ovviamente passandogli i certificati all’interno della configurazione.

Proviamo ora a loggarci con il nostro browser sulla nostra localhost:

![image.png](/images/posts/01_timesketch/image3.png)

Utilizzando le credenziali dell’utente creato poco fa ecco che siamo all’interno della nostra Dashboard:

![image.png](/images/posts/01_timesketch/image4.png)

Io preferisco utilizzare il tema dark per riposare gli occhi!

Come notiamo siamo all’interno del nostro utente User, ma più utenti possono collaborare all’interno della piattaforma come vedremo più tardi.

# Procedura 1 - Acquisizione Manuale con hayabusa

A questo punto ci spostiamo sulla prima Workstation windows per effettuare la nostra prima acquisizione con Hayabusa.

https://github.com/Yamato-Security/hayabusa/releases

Scaricare Hayabusa sulla macchina client, o direttamente dal sito oppure portandolo con una chiavetta autorizzata sulla macchina target, nel mio caso essendo uno scenario di test, lo scaricherò direttamente da internet.

```powershell
# Administrator Powershell
wget https://github.com/Yamato-Security/hayabusa/releases/download/v3.3.0/hayabusa-3.3.0-win-x64.zip -o hayabusa.zip
Expand-Archive .\hayabusa.zip .\hayabusa
cd .\hayabusa
```

Ora seguendo la documentazione ufficiale di Hayabusa dove ci mostra esattamente come creare la timeline e anche analizzarla successivamente su Timesketch

https://github.com/Yamato-Security/hayabusa/blob/main/doc/TimesketchImport/TimesketchImport-English.md

Gli argomenti da passare ad hayabusa sono la cartella (`-d`) contenente i log di una precedente aquisizione (eg. con KAPE) oppure una live analysis passando l’opzione “`-l`”

Ecco il comando per creare la timeline:

```powershell
# Administrator Powershell
.\hayabusa-3.3.0-win-x64.exe csv-timeline --help
# live-analysis
.\hayabusa-3.3.0-win-x64.exe update-rules
.\hayabusa-3.3.0-win-x64.exe csv-timeline -l -o ws01-hayabusa-timeline.csv -p timesketch-verbose --ISO-8601
```

![image.png](/images/posts/01_timesketch/image5.png)

![image.png](/images/posts/01_timesketch/image6.png)

Utilizzo il set di regole `Core+` .

![image.png](/images/posts/01_timesketch/image7.png)

Includo le sysmon rules anche se non ho installato sysmon sulle macchine, giusto per simulare le impostazioni adeguate.

![image.png](/images/posts/01_timesketch/image8.png)

ed ecco i risultati.

![image.png](/images/posts/01_timesketch/image9.png)

Ora siamo pronti per importare il nostro file all’interno di `timesketch`.

Torniamo all’interfaccia di timesketch e creaiamo una nuova investigazione:

![image.png](/images/posts/01_timesketch/image10.png)

![image.png](/images/posts/01_timesketch/image11.png)

![image.png](/images/posts/01_timesketch/image12.png)

![image.png](/images/posts/01_timesketch/image13.png)

![image.png](/images/posts/01_timesketch/image14.png)

![image.png](/images/posts/01_timesketch/image15.png)

Ed ecco la nostra visualizzazione utilizzando `Timesketch` della nostra Timeline creata con `hayabusa`.

# Procedura 2 - Acquisizione con Velocirapto ed import in Timesketch

Ora passeremo alla fase successiva ovvero la procedura 2, utilizzando Velociraptor, ricordiamo che anche questo task potrebbe essere automatizzato via GPO oppure creando un artefatto di velociraptor.

Partiamo facendo il deploy di `Velocirator` Server sempre tramite docker sulla nosta macchina Ubuntu:

```powershell
user@ubuntu-pc:~$ cat install-velociraptor.sh 

#!/bin/bash

cd /opt/
sudo git clone https://github.com/weslambert/velociraptor-docker
cd velociraptor-docker
sudo docker compose up -d

# Default configuration
# admin::admin

# To create other users
# sudo docker exec -it velociraptor ./velociraptor --config server.config.yaml user add user1 user1 --role administrator
```

![image.png](/images/posts/01_timesketch/image16.png)

Di default le credenziali sono `admin::admin` , queste credenziali come altre variabili d’ambiente possono essere modificate all’interno del file `.env`  della repository.

![image.png](/images/posts/01_timesketch/image17.png)

![image.png](/images/posts/01_timesketch/image18.png)

Ecco il nostro `Velociraptor` server Up & Running.

La prima cosa che faremo è creare una nuova organizzazione invece che usare l’organizzazione “`root`” di default:

![image.png](/images/posts/01_timesketch/image19.png)

![image.png](/images/posts/01_timesketch/image20.png)

![image.png](/images/posts/01_timesketch/image21.png)

Ora tornando alla Home troverò la nuova organizzazione appena creata:

![image.png](/images/posts/01_timesketch/image22.png)

Cliccando sull’icona utente e selezionando la nuova organizzazione, vedremo che il contesto si sposterà nella organizzazione selezionata, questo vale anche per altre operazioni che prenderanno come contesto di riferimento quello della nuova organizzazione e non quello root.

![image.png](/images/posts/01_timesketch/image23.png)

Ora che abbiamo terminato di configurare il server, dobbiamo installare Velociraptor Client sulle nostre macchina da acquisire, questo lo faremo con il file exe di velociraptor scaricabile dal sito ufficiale:

- https://docs.velociraptor.app/downloads/

L’eseguibile andrà lanciato passandogli la configurazione della nostra organizzazione:

![image.png](/images/posts/01_timesketch/image24.png)

Nel file di configurazione accertarsi che l’indirizzo o l’url del server sia corretto e successivamente portarlo sulla macchina da installare.

![image.png](/images/posts/01_timesketch/image25.png)

Il comando per installare velociraptor come servizio è il seguente:

```powershell
.\velociraptor-v0.74.1-windows-amd64.exe --config .\client.OKVAG.config.yaml service install
```

![image.png](/images/posts/01_timesketch/image26.png)

![image.png](/images/posts/01_timesketch/image27.png)

Ecco il nostro client attestato sul nostro server.

Creaiamo ora una configurazione per le nostre chiamate API, poichè velociraptor utilizza chiamate gRPC e non delle classiche HTTP REST, dobbiamo creare un profilo che ci consenta di fare delle chiamate successive.

```powershell
cd /opt/velociraptor-docker/velociraptor
# velociraptor is velociraptor linux executable
# a new user with role api
sudo ./velociraptor --config server.config.yaml user add --role=api dfir
cd ../../
sudo docker compose restart

sudo ./velociraptor --config server.config.yaml config api_client --name dfir --role administrator api.config.yaml
```

![image.png](/images/posts/01_timesketch/image28.png)

![image.png](/images/posts/01_timesketch/image29.png)

```powershell
sudo ./velociraptor --api_config api.config.yaml query "SELECT *
FROM foreach(row={
   SELECT OrgId
   FROM orgs()
},  query={
   SELECT *, OrgId
   FROM query(query={ SELECT client_id FROM clients() }, org_id=OrgId)
})" --format jsonl | jq

sudo ./velociraptor --api_config api.config.yaml query "
SELECT *
FROM query(
  query={ SELECT * FROM clients() WHERE client_id = 'C.b9368091e23d6a62-OKVAG' },
  org_id='OKVAG'
)
" --format jsonl | jq

sudo ./velociraptor --api_config api.config.yaml query "
SELECT *
FROM query(
  query={ SELECT * FROM clients() WHERE client_id != 'server' AND os_info.system = 'windows' },
  org_id='OKVAG'
)
" --format jsonl | jq .

```

Queste query potrebbero tornare utili successivamente per fare delle cacce o controllare gli stati e riprendere files.

Ora procediamo a fare una sul client in questione utilizzando `KAPE` files e il SANS_Triage.

![image.png](/images/posts/01_timesketch/image30.png)

![image.png](/images/posts/01_timesketch/image31.png)

![image.png](/images/posts/01_timesketch/image32.png)

![image.png](/images/posts/01_timesketch/image33.png)

![image.png](/images/posts/01_timesketch/image34.png)

![image.png](/images/posts/01_timesketch/image35.png)

![image.png](/images/posts/01_timesketch/image36.png)

![image.png](/images/posts/01_timesketch/image37.png)

Ora che ho scaricato i files acquisiti con il Triage, posso generare la mia super timelime con plaso utilizzando lo stesso container di timesketch.

```bash
# unzip Haunt file
cd /tmp/
unzip -q /home/user/Scaricati/H.D12QTAMHD5H4C.zip -d WS01-Raw 
mkdir /tmp/WS01
mv H.D124GB9SGJ12O/PC-WS01-C.c670b789871e759a-O8SE0/uploads/* /tmp/WS01

# move all the files into timesketch upload binded folder 
sudo mv /tmp/WS01 /opt/timesketch/upload/
sudo 
docker exec -i timesketch-worker /bin/bash -c "log2timeline.py --status_view window --storage-file /usr/share/timesketch/upload/WS01.plaso /usr/share/timesketch/upload/WS01/"

```

![image.png](/images/posts/01_timesketch/image38.png)

Per processare 1216MB - 1944 Files , ci sono voluti 10’ e 58’’

![image.png](/images/posts/01_timesketch/image39.png)

Per analizzare i warning generati da plaso, si può usare `pinfo.py`

```bash
sudo docker exec -i timesketch-worker pinfo.py /usr/share/timesketch/upload/WS01.plaso
```

Ora possiamo importare la timeline in plaso format in timesketch.

Usiamo il docker timesketch-web per listare gli sketch disponibili.

```bash
# List sketches to GET Sketch ID
sudo docker exec -i timesketch-web tsctl list-sketches
```

![image.png](/images/posts/01_timesketch/image40.png)

Vediamo al numero 1 la nostra investigazione chiamata “Red-Lab”.

Ora importiamo il file `.plaso` all’interno di `timesketch` , per farlo useremo sempre il docker `-worker` the userà l’importeri verso il docker `-web` utilizzando le credenziali dell’utente da noi creato all’inizio, nel nostro caso `user`:`user` .

Tuttavia scopriremo che l’importer non è installato nel `-worker` , per questo basta installarlo con `pip3` all’interno del docker. Ovviamente questa operazione può essere fatta anche da una macchina a parte e non dal docker ma per comodità lasciamo tutti gli strumenti confinati nel loro ambiente.

```bash
# Install timesketch-import-client into -worker container
sudo docker exec -i timesketch-worker pip3 install timesketch-import-client
```

![image.png](/images/posts/01_timesketch/image41.png)

Ora possiamo importare la nostra super timeline su `timesketch`.

```bash
# Import plaso file in timesketch
sudo docker exec -i timesketch-worker /bin/bash -c "timesketch_importer -u user -p 'user' --host http://timesketch-web:5000 --timeline_name WS01-Raptor --sketch_id 1 '/usr/share/timesketch/upload/WS01.plaso'"

```

![image.png](/images/posts/01_timesketch/image42.png)

Una volta lanciato l’upload possiamo vedere dall’interfaccia il processo in corso, ci metterà un pò di tempo prima di caricare tutto.

![image.png](/images/posts/01_timesketch/image43.png)

Ecco che l’importazione è in progress, con il mio setup per caricare 5.5M di eventi per la grandezza di 1.83GB , ci mette circa 2 ore.

![image.png](/images/posts/01_timesketch/image44.png)

Notes

```bash

# unzip Haunt file
cd /tmp/
unzip -q /home/user/Scaricati/H.D12QTAMHD5H4C.zip -d WS01-Raw 
mkdir /tmp/WS01
mv H.D124GB9SGJ12O/PC-WS01-C.c670b789871e759a-O8SE0/uploads/* /tmp/WS01

# move all the files into timesketch upload binded folder 
sudo mv /tmp/WS01 /opt/timesketch/upload/
docker exec -i timesketch-worker /bin/bash -c "log2timeline.py --status_view window --storage-file /usr/share/timesketch/upload/WS01.plaso /usr/share/timesketch/upload/WS01/"

# List sketches to GET Sketch ID
docker exec -i timesketch-web tsctl list-sketches

# Import plaso file in timesketch
docker exec -i timesketch-worker /bin/bash -c "timesketch_importer -u dfir -p 'dfir' --host http://timesketch-web:5000 --timeline_name WS01-Raptor --sketch_id 1 '/usr/share/timesketch/upload/WS01.plaso'"

```