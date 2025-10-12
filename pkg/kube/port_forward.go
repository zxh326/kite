package kube

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

func PortForward(config *rest.Config, namespace, podName string, ports []string, stopChan chan struct{}) error {
	path := fmt.Sprintf("/api/v1/namespaces/%s/pods/%s/portforward", namespace, podName)
	hostIP := strings.TrimLeft(config.Host, "htps:/")
	serverURL, err := url.Parse(fmt.Sprintf("https://%s", hostIP))
	if err != nil {
		return err
	}
	serverURL.Path = path

	transport, upgrader, err := spdy.RoundTripperFor(config)
	if err != nil {
		return err
	}

	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, http.MethodPost, serverURL)
	readyChan := make(chan struct{}, 1)

	fw, err := portforward.New(dialer, ports, stopChan, readyChan, nil, nil)
	if err != nil {
		return err
	}

	go func() {
		if err = fw.ForwardPorts(); err != nil {
			fmt.Printf("error forwarding ports: %v\n", err)
		}
	}()

	<-readyChan
	return nil
}
