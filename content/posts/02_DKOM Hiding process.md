---
title: "Exploring DKOM (Direct Kernel Object Manipulation) for Process Hiding on Windows"
date: 2025-07-29T00:12:29+01:00
draft: false
github_link: "https://github.com/gurusabarish/hugo-profile"
author: "Durok"
tags:
  - DKOM
  - Kernel
  - Driver
  - Rootkit
  - Volatility
  - Windbg
image: /images/posts/02_DKOM/00_DKOM_Cover.png
description: "**DKOM (Direct Kernel Object Manipulation)** technique, a well-known stealth method used by advanced malware and rootkits on Windows systems to hide processes from standard system monitoring tools."
toc: 
---

## Exploring DKOM for Process Hiding on Windows

In this post we will explore the **DKOM (Direct Kernel Object Manipulation)** technique, a well-known stealth method used by advanced malware and rootkits on Windows systems to hide processes from standard system monitoring tools.

### What is `DKOM`?

`DKOM` stands for **Direct Kernel Object Manipulation**.  
It is a technique that operates **directly on kernel data structures in memory**. Instead of hooking APIs or patching the kernel, DKOM modifies kernel objects in place, leaving no hooks that can be detected with integrity checks.

The most common use case:  
- **Hiding a process** by manipulating the linked list of `EPROCESS` structures.

---

## Hiding a Process Manually with `WinDbg`

### Preparing the Environment for `WinDbg`

Before experimenting with **DKOM** on Windows, it is crucial to work in a **controlled lab environment** to avoid damaging a production system.  

For this PoC you will need:

- A **Windows test machine (physical or virtual)** dedicated to research and malware analysis.
  - A VM (e.g., Hyper-V, VMware, VirtualBox) is recommended for snapshot/rollback capabilities.
  - **Kernel debugging must be enabled** on the target machine if you plan to attach remotely.

#### Tools Required

1. **`WinDbg`** (Preview or Classic)
   - Obtain from the [Microsoft Store](https://apps.microsoft.com/store/detail/windbg-preview/9PGJGD53TN86)  
     or the [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/).

> ✏️ **Note:** 
>     Recent versions of `WinDbg` (Preview) automatically configure and download symbols from the Microsoft symbol server. 
> Manual configuration is usually not required unless you need a custom symbol path or offline cache.

3. **Administrator Privileges**
   - Run `WinDbg` with elevated privileges to access live kernel memory.

4. **Target Process**
   - Launch a simple process (e.g., `notepad.exe`) that will be used as a target to demonstrate hiding.

---

#### 3. Kernel Debugging Setup

If your PoC involves **live kernel debugging** (recommended for DKOM analysis):

- Configure debugging transport (COM, TCP, or local):
  - For VMs, **named pipe (COM)** or **network KD** is most convenient.
  - Enable kernel debugging on the target:
    ```
    bcdedit /debug on
    ```
- Reboot the machine with debugging enabled.

> 💡 **Tip:** 
>     For local debugging, use `WinDbg (Open Kernel Object)` and select `Local`.

---

#### 4. Verification

After attaching `WinDbg` to the live kernel or memory dump verify the debugger connection:

```
!process 0 0
```

This should list all active processes.


---

With the environment ready, you will be able to **inspect, modify and unlink `EPROCESS` structures m
Using `WinDbg` connected to a live system or a memory dump, it is possible to:

1. 2. Identify the `EPROCESS` entry for your test process (`notepad.exe`).
