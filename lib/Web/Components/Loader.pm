package Web::Components::Loader;

use strictures;
use namespace::autoclean;

use HTTP::Status          qw( HTTP_BAD_REQUEST HTTP_FOUND
                              HTTP_INTERNAL_SERVER_ERROR );
use Try::Tiny;
use Unexpected::Types     qw( ArrayRef CodeRef HashRef NonEmptySimpleStr
                              Object RequestFactory );
use Web::Components::Util qw( deref exception is_arrayref
                              load_components throw );
use Web::ComposableRequest;
use Web::Simple::Role;

requires qw( config log );

# Public attributes
has 'factory_args' => is => 'lazy', isa => CodeRef,
   builder => '_build_factory_args';

has 'controllers' => is => 'lazy', isa => HashRef[Object], builder => sub {
   load_components 'Controller', application => $_[0]
};

has 'models' => is => 'lazy', isa => HashRef[Object], builder => sub {
   my $self = shift;

   load_components 'Model',
      application => $self,
      controllers => $self->controllers,
      views       => $self->views
};

has 'views' => is => 'lazy', isa => HashRef[Object], builder => sub {
   load_components 'View', application => $_[0]
};

# Private attributes
has '_action_suffix' => is => 'lazy', isa => NonEmptySimpleStr,
   builder => sub { deref $_[0]->config, 'action_suffix', '_action' };

has '_factory' => is => 'lazy', isa => RequestFactory,
   builder => '_build__factory', handles => [ 'new_from_simple_request' ];

has '_routes' => is => 'lazy', isa => ArrayRef, builder => '_build__routes';

has '_tunnel_method' => is => 'lazy', isa => NonEmptySimpleStr,
   builder => sub { deref $_[0]->config, 'tunnel_method', 'from_request' };

# Attribute constructors
sub _build_factory_args {
   my $self   = shift;
   my $prefix = deref $self->config, 'name';

   return sub {
      my ($self, $attr) = @_;

      $attr->{domain_prefix} = $prefix if $prefix;

      return $attr;
   };
}

sub _build__factory {
   my $self = shift;

   return Web::ComposableRequest->new(
      buildargs => $self->factory_args,
      config    => $self->config,
   );
}

sub _build__routes {
   my $self        = shift;
   my $controllers = $self->controllers;
   my @keys        = keys %{$controllers};

   return [ map { $controllers->{$_}->dispatch_request } sort @keys ];
}

# Private functions
sub _header () {
   return [ 'Content-Type' => 'text/plain', @{ $_[0] // [] } ];
};

# Private methods
sub _get_context {
   my ($self, $moniker, $req) = @_;

   my $model = $self->models->{$moniker};

   return $model->get_context($req, $self->models)
      if $model->can('get_context');

   return Web::Components::Loader::Context->new( request => $req );
}

sub _internal_server_error {
   my ($self, $e) = @_;

   $self->log->error($e);

   return [ HTTP_INTERNAL_SERVER_ERROR, _header, [$e] ];
}

sub _parse_sig {
   my ($self, $args) = @_;

   return @{$args} if exists $self->models->{$args->[0]};

   my ($moniker, $method) = split m{ / }mx, $args->[0], 2;

   if (exists $self->models->{$moniker}) {
      shift @{$args};
      return $moniker, $method, @{$args};
   }

   return;
}

sub _recognise_signature {
   my ($self, $args) = @_;

   return 1 if is_arrayref $args and $args->[0]
      and exists $self->models->{$args->[0]};

   my ($moniker, $method) = split m{ / }mx, $args->[0], 2;

   return 1 if $moniker and exists $self->models->{$moniker};

   return 0;
}

sub _redirect {
   my ($self, $req, $stash) = @_;

   my $code     = $stash->{code} // HTTP_FOUND;
   my $redirect = $stash->{redirect};
   my $location = $redirect->{location};

   if (my $message = $redirect->{message}) {
      $self->log->info($req->loc_default(@{$message}))
         if $req->can('loc_default');

      if ($req->can('session')) {
         my $session = $req->session;

         if ($session->can('add_status_message')) {
            if (my $mid = $session->add_status_message($message)) {
               $location->query_form($location->query_form, 'mid' => $mid);
            }
         }
      }
   }

   return [ $code, [ 'Location', $location ], [] ];
}

sub _render_view {
   my ($self, $moniker, $context, $method) = @_;

   my $req   = $context->request;
   my $stash = $context->stash;

   return $self->_redirect($req, $stash) if exists $stash->{redirect};

   throw 'Model [_1] method [_2] stashed no view', [ $moniker, $method ]
      unless $stash->{view};

   my $view = $self->views->{$stash->{view}}
      or throw 'Model [_1] method [_2] unknown view [_3]',
               [ $moniker, $method, $stash->{view} ];
   my $res  = $view->serialize($context)
      or throw 'View [_1] returned false', [ $stash->{view} ];

   return $res;
}

sub _render_exception {
   my ($self, $moniker, $context, $e) = @_;

   $e = exception $e, { level => 2, rv => HTTP_BAD_REQUEST }
      unless $e && $e->can('rv') && $e->rv > HTTP_BAD_REQUEST;

   my $attr = deref $self->config, 'loader_attr', { should_log_errors => 1 };

   if ($attr->{should_log_errors}) {
      my $req = $context->request;
      my $username = $req->can('username') ? $req->username : 'unknown';
      my $msg = "${e}"; chomp $msg;

      $self->log->error("${msg} (${username})");
   }

   my $res;

   try   {
      $self->models->{$moniker}->exception_handler($context, $e);
      $res = $self->_render_view($moniker, $context, 'exception_handler');
   }
   catch { $res = $self->_internal_server_error("${e}\n${_}") };

   return $res;
}

sub _render {
   my ($self, @args) = @_;

   $self->_recognise_signature($args[0]) or return @args;

   my ($moniker, $method, undef, @request) = $self->_parse_sig($args[0]);

   my $opts = { domain => $moniker };
   my ($req, $res);

   try   { $req = $self->new_from_simple_request($opts, @request) }
   catch { $res = $self->_internal_server_error($_) };

   return $res if $res;

   my $context;

   try   { $context = $self->_get_context($moniker, $req) }
   catch { $res     = $self->_internal_server_error($_) };

   return $res if $res;

   try   {
      $method = $req->tunnel_method.$self->_action_suffix
         if $method eq $self->_tunnel_method;

      $res = $self->models->{$moniker}->execute($context, $method);

      $res = $self->_render_view($moniker, $context, $method)
         unless $res && is_arrayref $res; # Plack response short circuits view
   }
   catch { $res = $self->_render_exception($moniker, $context, $_) };

   $req->session->update if $req->can('session');

   return $res;
}

sub _filter () {
   my $self = shift; return response_filter { $self->_render(@_) };
}

# Construction
sub dispatch_request { # uncoverable subroutine
   # Not applied if it already exists in the consuming class
}

around 'dispatch_request' => sub { \&_filter, @{$_[1]->_routes} };

package
   Web::Components::Loader::Context;

use List::Util qw( pairs );
use Moo;

has 'request' => is => 'ro', required => 1;

has '_stash' => is => 'ro', default => sub { {} };

sub stash {
   my ($self, @args) = @_;

   return $self->_stash unless $args[0];

   for my $pair (pairs @args) {
      $self->_stash->{$pair->key} = $pair->value;
   }

   return $self->_stash;
}

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::Loader - Loads and instantiates MVC components

=head1 Synopsis

   package Component::Server;

   use Class::Usul;
   use Plack::Builder;
   use Web::Simple;
   use Moo;

   has '_usul' => is => 'lazy', builder => sub {
      Class::Usul->new( config => { appclass => __PACKAGE__  } ) },
      handles  => [ 'config', 'debug', 'l10n', 'lock', 'log' ];

   with q(Web::Components::Loader);

=head1 Description

Loads and instantiates MVC components. Searches the namespaces; C<Controller>,
C<Model>, and C<View> in the consuming classes library root. Any components
found are loaded and instantiated

The component collection references are passed to the component constructors
so that a component can discover any dependent components. The collection
references are not fully populated when the component is instantiated so
attributes that default to component references should be marked as lazy

=head1 Configuration and Environment

This role requires C<config> and C<log> methods in the consuming class

Defines the following attributes;

=over 3

=item C<controllers>

An array reference of controller object reference sorted into C<moniker>
order

=item C<models>

A hash reference of model object references

=item C<view>

A hash reference of view object references

=back

=head1 Subroutines/Methods

=head2 C<dispatch_request>

Installs a response filter that processes and renders the responses from
the controller methods

Controller responses that do not match the expected signature are allowed to
bubble up

The expected controller return value signature is;

   [ 'model_moniker', 'method_name', @web_simple_request_parameters ]

The L<Web::Simple> request parameters are used to instantiate an instance of
L<Web::ComposableRequest::Base>

The specified method on the model select by the moniker is called passing the
request object in. A hash references, the stash, is the expected response and
this is passed along with the request object into the view which renders the
response

Array references, a L<Plack> response, are allowed to bubble up and bypass
the call to the view

If the stash contains a redirect attribute then a redirect response is
generated. Any message intended to be viewed by the user is stored in the
session and is retrieved by the next request

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<HTTP::Message>

=item L<Try::Tiny>

=item L<Unexpected>

=item L<Web::Simple>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2017 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
