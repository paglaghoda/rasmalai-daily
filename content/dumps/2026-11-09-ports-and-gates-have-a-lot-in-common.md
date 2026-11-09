---
title: ports and gates have a lot in common
summary: what ports are and how to check open ports in your pc
tags: [networking]
---

# Goal: Execure & print my name on Vidhi's open terminal 

## What are ports?
ports are used to identify the reciever of the data transmitted.

### for example - 
assume u are a postman and u want to deliver a letter to a person: what all things do u need to deliver the letter, an address?

yes, similary to deliver data to a client/reciever, we need their address (IP Add) and their port num.

### Assume, a house:
1> port num = door of the house (front/back/lawn)
2> IP address = address of the house

There are ports numbered from: 1 to 1023 - for computers mostly, 1024 to 49k for weird purposes

### Some common ports
80 - HTTP
443 - HTTPS
25 - SMTP w/o SSL
143 - IMAP

### To see open ports in your PC:
1> Find ur IP: run ipconfig getifaddr en0
2> run nestat (app also installed) or thru terminal
netstat -an | grep LISTEN

"""

Last login: Tue Nov 10 02:59:05 on ttys006
omkarsahay@192 ~ % 
omkarsahay@192 ~ % netstat -an | grep LISTEN

tcp4       0      0  127.0.0.1.44438        *.*                    LISTEN     
tcp4       0      0  127.0.0.1.52056        *.*                    LISTEN     
tcp6       0      0  ::1.32222              *.*                    LISTEN     
tcp4       0      0  127.0.0.1.32222        *.*                    LISTEN     
tcp4       0      0  127.0.0.1.8021         *.*                    LISTEN     
tcp6       0      0  ::1.8021               *.*                    LISTEN     
tcp6       0      0  *.64876                *.*                    LISTEN     
tcp4       0      0  *.64876                *.*                    LISTEN     
tcp46      0      0  *.3306                 *.*                    LISTEN     
tcp46      0      0  *.33060                *.*                    LISTEN     
tcp4       0      0  127.0.0.1.5432         *.*                    LISTEN     
tcp6       0      0  ::1.5432               *.*                    LISTEN     
tcp6       0      0  ::1.7679               *.*                    LISTEN     
tcp6       0      0  *.5000                 *.*                    LISTEN     
tcp4       0      0  *.5000                 *.*                    LISTEN     
tcp6       0      0  *.7000                 *.*                    LISTEN     
tcp4       0      0  *.7000                 *.*                    LISTEN     
omkarsahay@192 ~ % 

"""

 these are in the structure of:
 Take one line:

text
tcp4   0   0   127.0.0.1.49842   *.*   LISTEN

"""

Field	Value	Meaning
Proto	tcp4	TCP over IPv4. (tcp6 = IPv6, tcp46 = both)
Recv-Q	0	Bytes received but not yet read by the app
Send-Q	0	Bytes queued to send
Local Address	127.0.0.1.49842	The IP and port it's listening on
Foreign Address	*.*	Who's connected — *.* means "nobody yet," waiting for a connection
State	LISTEN	Actively waiting for incoming connections
"""

thats it for today, byeee
