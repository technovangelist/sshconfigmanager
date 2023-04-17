# sshconfigmanager

This is a simple SSH Configuration Manager. It has a few command line parameters:

    --host            Name of the Config Entry
    --hostname        Name of the actual host in DNS, or the ipaddress
    --identityFile    Full path for the private key
    --user            User for whom the public key is in their authorized_keys file
    --autoaccept      If this is on the command line, it will not ask for verification

I have this deployed to my machine as `scman`.

It will look for the host in your current config file, and update it with the new info provided in this command. If it doesn't exist, this command will add the entry. Any commented entries will disappear. Finally, all the entries will be sorted in alphabetical order.
