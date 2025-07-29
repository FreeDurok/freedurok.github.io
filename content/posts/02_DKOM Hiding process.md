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

## Description

In this post we will explore the **DKOM (Direct Kernel Object Manipulation)** technique, a well-known stealth method used by advanced malware and rootkits on Windows systems to hide processes from standard system monitoring tools.

---

## 1. What is `DKOM`?

`DKOM` stands for **Direct Kernel Object Manipulation**.  
It is a technique that operates **directly on kernel data structures in memory**. Instead of hooking APIs or patching the kernel, DKOM modifies kernel objects in place, leaving no hooks that can be detected with integrity checks.

The most common use case:  
- **Hiding a process** by manipulating the linked list of `EPROCESS` structures.

---

## 2. Hiding a Process Manually with `WinDbg`

Using `WinDbg` connected to a live system or a memory dump, it is possible to:

1. Locate the `EPROCESS` structure of the target process:
