---
title: "Hayabusa + Velociraptor -> Timesketch: How to build a SuperTimeline"
date: 2025-07-27T00:12:29+01:00
draft: false
github_link: "https://github.com/gurusabarish/hugo-profile"
author: "Durok"
tags:
  - DFIR
  - Timeline
  - Velociraptor
  - Timesketch
image: /images/posts/01_timesketch/00_Cover.png
description: ""
toc: 
---

## Description

This write-up shows how to build timelines from Windows machines to be examined in Triage following a compromise, from the acquisition of all artifacts to the generation of a Super-Timeline and its visualisation with [Timesketch](https://timesketch.org) using tools such as [Hayabusa](https://github.com/Yamato-Security/hayabusa), [Velociraptor](https://docs.velociraptor.app/docs/deployment/quickstart/) and [plaso](https://github.com/log2timeline/plaso).

To be precise, we will carry out two distinct procedures:
1. Manual acquisition with Hayabusa
    1. Acquisition and timeline generation with Hayabusa
    2. Import and display on Timesketch
2. Automatic acquisition with Velociraptor
    1. Acquisition with KAPE Files module → SANS Triage
    2. Super-Timeline generation with plaso (via timesketch worker)
    3. Import and display on Timesketch

## Lab Environment
The LAB environment used for this test consists of:
- 1 Domain Controller – Windows Server 2025
    - Velociraptor Client
- 1 Workstation – Windows 11 Pro
    - Hayabusa
    - Velociraptor Client
- 1 Kali
    - Cobalt Strike
- 1 Ubuntu 24.04 – CPU 1x4 – RAM 8GB – Disk 50GB
    - Velociraptor Server
        - Docker deployment
    - Timesketch
        - Docker deployment

The steps for installing the virtual machines and configuring Kali are skipped.
Cobalt Strike and Harriet were used to seed IOCs in the environment, but any method can be used for this purpose.
Audit policies on the Domain Controller were not configured, as the focus is on the timeline creation procedure and its automation, working on a single server.
We will start with the first timeline: using Hayabusa to generate a timeline and then import it into Timesketch.
To do this, we move to the Ubuntu machine and proceed to install Timesketch via Docker.

### [Install Docker](https://docs.docker.com/engine/install/ubuntu/) on Ubuntu
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

### [Install Timesketch](https://timesketch.org/guides/admin/install/) via Docker:

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

The script already includes the command to create a user, and consequently, after the Docker containers start, you will be prompted to set a password for the `user` account (in this case). You may use any username you prefer. For convenience, we will use `user::user`.

![image.png](/images/posts/01_timesketch/image1.png)

Here I repeated the operation manually. Obviously, the command shown here must be executed from the folder containing the Docker environment variables, in my case from `/opt/timesketch`, which is the path where the script will install everything needed to start the `docker-compose.yaml` of `timeskecth`.
Now let's check that everything is up and running:

![image.png](/images/posts/01_timesketch/image2.png)

If you want to learn more about all the various components of TimeSketch, you can consult the [documentation](https://timesketch.org/guides/admin/install/) on their website and take a closer look at `docker-compose.yaml`.

One of the components is an nginx server that acts as a proxy and exposes ports `80` and `443`. We will not look at how to configure the `https` protocol, but it is obviously possible to do so by passing the certificates within the configuration.

Let's now try to log in with our browser on our localhost:

![image.png](/images/posts/01_timesketch/image3.png)

Using the credentials of the user created earlier, we are now inside our Dashboard:

![image.png](/images/posts/01_timesketch/image4.png)

I prefer to use the dark theme to rest my eyes!

As we can see, we are inside our User account, but multiple users can collaborate within the platform, as we will see later.

## 1 - Manual acquisition with Hayabusa

At this point, we move to the first Windows workstation to generate our first timeline using [Hayabusa](https://github.com/Yamato-Security/hayabusa/releases).

Download Hayabusa onto the client machine, either directly from the website or by transferring it via an authorized USB drive to the target machine.
In this test scenario, I will download it directly from the Internet.

```powershell
# Administrator Powershell
wget https://github.com/Yamato-Security/hayabusa/releases/download/v3.3.0/hayabusa-3.3.0-win-x64.zip -o hayabusa.zip
Expand-Archive .\hayabusa.zip .\hayabusa
cd .\hayabusa
```
Now, following [Hayabusa's official documentation](https://github.com/Yamato-Security/hayabusa/blob/main/doc/TimesketchImport/TimesketchImport-English.md), which shows us exactly how to create the timeline and then analyse it on Timesketch.
The arguments to pass to hayabusa with option `-d` are the folder containing the logs of a previous acquisition (e.g. with KAPE) or a live analysis by passing the option `-l`.

Here is the command to create the timeline:
```powershell
# Administrator Powershell
.\hayabusa-3.3.0-win-x64.exe csv-timeline --help
# live-analysis
.\hayabusa-3.3.0-win-x64.exe update-rules
.\hayabusa-3.3.0-win-x64.exe csv-timeline -l -o ws01-hayabusa-timeline.csv -p timesketch-verbose --ISO-8601
```

![image.png](/images/posts/01_timesketch/image5.png)

![image.png](/images/posts/01_timesketch/image6.png)

I am using the `Core+` ruleset.

![image.png](/images/posts/01_timesketch/image7.png)

I am including the `Sysmon` rules.

![image.png](/images/posts/01_timesketch/image8.png)

And here are the results: Hayabusa successfully generated a detailed timeline of events, which can now be imported and analyzed within Timesketch.

![image.png](/images/posts/01_timesketch/image9.png)

We are now ready to import our file into `Timesketch`.

Let's return to the Timesketch interface and create a new investigation:

![image.png](/images/posts/01_timesketch/image10.png)

![image.png](/images/posts/01_timesketch/image11.png)

![image.png](/images/posts/01_timesketch/image12.png)

![image.png](/images/posts/01_timesketch/image13.png)

![image.png](/images/posts/01_timesketch/image14.png)

![image.png](/images/posts/01_timesketch/image15.png)

Here is our visualization in `Timesketch` of the timeline generated with `Hayabusa`. In Timesketch, each imported timeline is referred to as a "sketch", one of the platform's core concepts. Multiple sketches can be created and managed together within a single case, allowing for collaborative analysis and correlation of different timelines.

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